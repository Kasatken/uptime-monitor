import type { CheckPointDto } from '@vigil/shared';
import { linear } from './scale';

interface SparklineProps {
  points: CheckPointDto[];
  width?: number;
  height?: number;
}

/** Last N response times. Failed checks are drawn as red ticks on the baseline. */
export function Sparkline({ points, width = 120, height = 32 }: SparklineProps) {
  if (points.length < 2) {
    return <div style={{ width, height }} className="rounded bg-surface-muted/60" aria-hidden />;
  }

  const max = Math.max(1, ...points.map((p) => p.responseMs ?? 0));
  const x = linear([0, points.length - 1], [1, width - 1]);
  const y = linear([0, max], [height - 3, 3]);

  // Break the line where a check has no response time (it failed)
  let path = '';
  let penDown = false;
  points.forEach((point, i) => {
    if (point.responseMs === null) {
      penDown = false;
      return;
    }
    path += `${penDown ? 'L' : 'M'}${x(i).toFixed(1)},${y(point.responseMs).toFixed(1)}`;
    penDown = true;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="overflow-visible"
    >
      <path
        d={path}
        fill="none"
        className="stroke-fg-subtle"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {points.map((point, i) =>
        point.status === 'down' ? (
          <rect
            key={point.checkedAt}
            x={x(i) - 1}
            y={height - 6}
            width={2}
            height={6}
            rx={1}
            className="fill-down"
          />
        ) : null,
      )}
    </svg>
  );
}
