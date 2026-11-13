import type { CheckPointDto } from '@vigil/shared';
import { cn } from '../../lib/cn';
import { linear } from './scale';

interface SparklineProps {
  points: CheckPointDto[];
  width?: number;
  height?: number;
  onColor?: boolean;
}

export function Sparkline({ points, width = 120, height = 36, onColor = false }: SparklineProps) {
  if (points.length < 2) {
    return (
      <div
        style={{ width, height }}
        className={cn('rounded-full', onColor ? 'bg-white/30' : 'bg-surface-muted')}
        aria-hidden
      />
    );
  }

  const max = Math.max(1, ...points.map((p) => p.responseMs ?? 0));
  const x = linear([0, points.length - 1], [2, width - 2]);
  const y = linear([0, max], [height - 4, 4]);

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
        className={onColor ? 'stroke-on-color/60' : 'stroke-fg-subtle'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point, i) =>
        point.status === 'down' ? (
          <circle
            key={point.checkedAt}
            cx={x(i)}
            cy={height - 3}
            r={2.5}
            className={onColor ? 'fill-on-color' : 'fill-down'}
          />
        ) : null,
      )}
    </svg>
  );
}
