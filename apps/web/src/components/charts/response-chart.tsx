import type { CheckPointDto } from '@vigil/shared';
import { type PointerEvent, useId, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { formatMs } from '../../lib/format';
import { formatDateTime, formatShortTime, formatTime } from '../../lib/time';
import { useElementWidth } from '../../lib/use-element-width';
import { STATUS_META } from '../status';
import { linear, nearestIndex, niceCeil } from './scale';

const HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 26, left: 52 };
const DAY_MS = 86_400_000;

// Drawn for a dark card. The time axis starts at the first point, not at the start of the
// selected range, so a monitor created ten minutes ago fills the chart instead of a sliver.
export function ResponseChart({ points }: { points: CheckPointDto[] }) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = useId();

  const chart = useMemo(() => {
    if (width === 0 || points.length === 0) return null;

    const times = points.map((p) => new Date(p.checkedAt).getTime());
    const start = times[0] as number;
    const end = Math.max(Date.now(), times.at(-1) as number);
    const maxMs = niceCeil(Math.max(...points.map((p) => p.responseMs ?? 0)) * 1.1);
    const formatTick = (ms: number) => {
      const iso = new Date(ms).toISOString();
      return end - start < DAY_MS ? formatShortTime(iso) : formatDateTime(iso);
    };

    const x = linear([start, end], [PAD.left, width - PAD.right]);
    const y = linear([0, maxMs], [HEIGHT - PAD.bottom, PAD.top]);
    const xs = times.map(x);
    const baseline = y(0);

    let line = '';
    let area = '';
    let segmentStart: number | null = null;
    let lastX = 0;

    points.forEach((point, i) => {
      const px = xs[i] as number;
      if (point.responseMs === null) {
        if (segmentStart !== null) area += `L${lastX},${baseline}L${segmentStart},${baseline}Z`;
        segmentStart = null;
        return;
      }
      const py = y(point.responseMs);
      const command = segmentStart === null ? 'M' : 'L';
      line += `${command}${px},${py}`;
      area += `${command}${px},${py}`;
      segmentStart ??= px;
      lastX = px;
    });
    if (segmentStart !== null) area += `L${lastX},${baseline}L${segmentStart},${baseline}Z`;

    return {
      x,
      y,
      xs,
      line,
      area,
      baseline,
      formatTick,
      ticks: [0, maxMs / 2, maxMs],
      timeTicks: [start, (start + end) / 2, end],
    };
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
        <div className="grid h-full place-items-center text-sm text-white/50">
          За этот период проверок ещё не было
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
            aria-label={`График времени ответа, проверок: ${points.length}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#cbef5b" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#cbef5b" stopOpacity={0} />
              </linearGradient>
            </defs>

            {chart.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={chart.y(tick)}
                  y2={chart.y(tick)}
                  stroke="rgb(255 255 255 / 0.1)"
                  strokeDasharray={tick === 0 ? undefined : '3 5'}
                />
                <text
                  x={PAD.left - 10}
                  y={chart.y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-white/45 text-[11px] tabular"
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
                className="fill-white/45 text-[11px] tabular"
              >
                {i === 2 ? 'сейчас' : chart.formatTick(tick)}
              </text>
            ))}

            <path d={chart.area} fill={`url(#${gradientId})`} />
            <path
              d={chart.line}
              fill="none"
              stroke="#cbef5b"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, i) =>
              point.status === 'down' ? (
                <circle
                  key={point.checkedAt}
                  cx={chart.xs[i]}
                  cy={chart.baseline - 5}
                  r={4}
                  fill="#f06446"
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
                  stroke="rgb(255 255 255 / 0.25)"
                />
                {hoveredPoint.responseMs !== null && (
                  <circle
                    cx={hoveredX}
                    cy={chart.y(hoveredPoint.responseMs)}
                    r={6}
                    fill="#cbef5b"
                    stroke="#161616"
                    strokeWidth={3}
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
            'pointer-events-none absolute top-0 z-10 rounded-2xl bg-lime px-3.5 py-2 text-xs text-on-color shadow-xl',
            hoveredX > width / 2 ? '-translate-x-[calc(100%+14px)]' : 'translate-x-3.5',
          )}
          style={{ left: hoveredX }}
        >
          <div className="opacity-70 tabular">{formatTime(hoveredPoint.checkedAt)}</div>
          <div className="mt-0.5 flex items-center gap-2 font-semibold">
            <span>{STATUS_META[hoveredPoint.status].label}</span>
            <span className="tabular">{formatMs(hoveredPoint.responseMs)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
