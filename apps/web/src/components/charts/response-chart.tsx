import type { CheckPointDto } from '@vigil/shared';
import { type PointerEvent, useId, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { formatMs } from '../../lib/format';
import { formatDateTime, formatTime } from '../../lib/time';
import { useElementWidth } from '../../lib/use-element-width';
import { STATUS_META } from '../status';
import { linear, nearestIndex, niceCeil } from './scale';

const HEIGHT = 200;
const PAD = { top: 12, right: 12, bottom: 24, left: 48 };

const DAY_MS = 86_400_000;

/**
 * Response time over time. Gaps in the line are failed checks, also marked in red
 * on the time axis. Hover shows the nearest check.
 *
 * The time axis starts at the first point, not at the start of the selected range:
 * a monitor created 10 minutes ago should fill the chart, not be a sliver on the right.
 */
export function ResponseChart({ points }: { points: CheckPointDto[] }) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = useId();

  const chart = useMemo(() => {
    if (width === 0 || points.length === 0) return null;

    const times = points.map((p) => new Date(p.checkedAt).getTime());
    const start = times[0] as number;
    const end = Math.max(Date.now(), times.at(-1) as number);
    const formatTick = (ms: number) => {
      const iso = new Date(ms).toISOString();
      return end - start < DAY_MS ? formatTime(iso).slice(0, 5) : formatDateTime(iso);
    };
    const maxMs = niceCeil(Math.max(...points.map((p) => p.responseMs ?? 0)) * 1.1);

    const x = linear([start, end], [PAD.left, width - PAD.right]);
    const y = linear([0, maxMs], [HEIGHT - PAD.bottom, PAD.top]);
    const xs = times.map(x);

    let line = '';
    let area = '';
    let segmentStart: number | null = null;
    let lastX = 0;
    const baseline = y(0);

    points.forEach((point, i) => {
      const px = xs[i] as number;
      if (point.responseMs === null) {
        if (segmentStart !== null) area += `L${lastX},${baseline}L${segmentStart},${baseline}Z`;
        segmentStart = null;
        return;
      }
      const py = y(point.responseMs);
      if (segmentStart === null) {
        line += `M${px},${py}`;
        area += `M${px},${py}`;
        segmentStart = px;
      } else {
        line += `L${px},${py}`;
        area += `L${px},${py}`;
      }
      lastX = px;
    });
    if (segmentStart !== null) area += `L${lastX},${baseline}L${segmentStart},${baseline}Z`;

    const ticks = [0, maxMs / 2, maxMs];
    const timeTicks = [start, (start + end) / 2, end];

    return { x, y, xs, line, area, ticks, timeTicks, baseline, formatTick };
  }, [points, width]);

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!chart) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setHovered(nearestIndex(chart.xs, event.clientX - bounds.left));
  };

  const hoveredPoint = hovered !== null ? points[hovered] : undefined;
  const hoveredX = hovered !== null ? chart?.xs[hovered] : undefined;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
      {points.length === 0 ? (
        <div className="grid h-full place-items-center text-sm text-fg-muted">
          No checks in this period yet
        </div>
      ) : (
        chart && (
          <svg
            width={width}
            height={HEIGHT}
            className="touch-none overflow-visible"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHovered(null)}
            role="img"
            aria-label={`Response time chart with ${points.length} checks`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>

            {chart.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={chart.y(tick)}
                  y2={chart.y(tick)}
                  className="stroke-line"
                  strokeDasharray={tick === 0 ? undefined : '3 4'}
                />
                <text
                  x={PAD.left - 8}
                  y={chart.y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-fg-subtle text-[10px] tabular"
                >
                  {formatMs(tick)}
                </text>
              </g>
            ))}

            {chart.timeTicks.map((tick, i) => (
              <text
                key={tick}
                x={chart.x(tick)}
                y={HEIGHT - 6}
                textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
                className="fill-fg-subtle text-[10px] tabular"
              >
                {i === 2 ? 'now' : chart.formatTick(tick)}
              </text>
            ))}

            <path d={chart.area} fill={`url(#${gradientId})`} />
            <path
              d={chart.line}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.75}
              strokeLinejoin="round"
            />

            {points.map((point, i) =>
              point.status === 'down' ? (
                <rect
                  key={point.checkedAt}
                  x={(chart.xs[i] as number) - 1.5}
                  y={chart.baseline - 8}
                  width={3}
                  height={8}
                  rx={1}
                  className="fill-down"
                />
              ) : null,
            )}

            {hoveredPoint && hoveredX !== undefined && (
              <g pointerEvents="none">
                <line
                  x1={hoveredX}
                  x2={hoveredX}
                  y1={PAD.top}
                  y2={chart.baseline}
                  className="stroke-line-strong"
                />
                {hoveredPoint.responseMs !== null && (
                  <circle
                    cx={hoveredX}
                    cy={chart.y(hoveredPoint.responseMs)}
                    r={4}
                    fill="var(--accent)"
                    className="stroke-surface"
                    strokeWidth={2}
                  />
                )}
              </g>
            )}
          </svg>
        )
      )}

      {hoveredPoint && hoveredX !== undefined && (
        <div
          className={cn(
            'pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg',
            hoveredX > width / 2 ? '-translate-x-[calc(100%+12px)]' : 'translate-x-3',
          )}
          style={{ left: hoveredX }}
        >
          <div className="text-fg-muted tabular">{formatTime(hoveredPoint.checkedAt)}</div>
          <div className="mt-0.5 flex items-center gap-2 font-medium">
            <span className={STATUS_META[hoveredPoint.status].text}>
              {STATUS_META[hoveredPoint.status].label}
            </span>
            <span className="tabular">{formatMs(hoveredPoint.responseMs)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
