import type { DailyUptimeDto } from '@vigil/shared';
import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { formatMs, formatUptime } from '../../lib/format';
import { formatDay } from '../../lib/time';
import { uptimeTone } from '../status';

/** On narrow screens only the last 30 days are shown. */
const MOBILE_DAYS = 30;

function describeDay(day: DailyUptimeDto): string {
  if (day.uptime === null) return `${formatDay(day.day)}: no data`;
  const response = day.avgResponseMs !== null ? `, avg ${formatMs(day.avgResponseMs)}` : '';
  return `${formatDay(day.day)}: ${formatUptime(day.uptime)} uptime${response}`;
}

/**
 * One bar per day. Semantically it's a slider over days: hover, or focus and use
 * the arrow keys / Home / End. Screen readers announce each day via aria-valuetext.
 */
export function UptimeBars({ days, label }: { days: DailyUptimeDto[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [tooltipX, setTooltipX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const last = days.length - 1;

  const activate = (index: number) => {
    const bar = barRefs.current[index];
    if (!bar) return;
    setActive(index);
    setTooltipX(bar.offsetLeft + bar.offsetWidth / 2);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const current = active ?? last;
    const next = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    activate(Math.min(Math.max(next, 0), last));
  };

  // Find the bar under the pointer (bars hidden on mobile have zero width and are skipped)
  const onPointerMove = (event: PointerEvent) => {
    const x = event.clientX - (containerRef.current?.getBoundingClientRect().left ?? 0);
    const index = barRefs.current.findIndex(
      (bar) => bar && bar.offsetWidth > 0 && x <= bar.offsetLeft + bar.offsetWidth + 1,
    );
    if (index !== -1 && index !== active) activate(index);
  };

  const activeDay = active !== null ? days[active] : undefined;
  const containerWidth = containerRef.current?.clientWidth ?? 0;
  // keep the tooltip inside the card near the edges
  const align = tooltipX < 80 ? 'left' : tooltipX > containerWidth - 80 ? 'right' : 'center';

  return (
    <div className="relative">
      <div
        ref={containerRef}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={active ?? last}
        aria-valuetext={
          days[active ?? last] ? describeDay(days[active ?? last] as DailyUptimeDto) : undefined
        }
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => active === null && activate(last)}
        onBlur={() => setActive(null)}
        className="flex h-8 touch-none items-stretch gap-[2px] rounded-sm"
      >
        {days.map((day, index) => (
          <span
            key={day.day}
            ref={(element) => {
              barRefs.current[index] = element;
            }}
            className={cn(
              'flex-1 rounded-[2px] transition-opacity',
              uptimeTone(day.uptime),
              active !== null && active !== index && 'opacity-50',
              index < days.length - MOBILE_DAYS && 'max-sm:hidden',
            )}
          />
        ))}
      </div>

      {activeDay && (
        <div
          className={cn(
            'pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-56 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg',
            align === 'center' && '-translate-x-1/2',
            align === 'right' && '-translate-x-full',
          )}
          style={{ left: align === 'left' ? 0 : align === 'right' ? '100%' : tooltipX }}
        >
          <div className="font-medium">{formatDay(activeDay.day)}</div>
          {activeDay.uptime === null ? (
            <div className="text-fg-muted">No data</div>
          ) : (
            <div className="mt-0.5 flex gap-3 text-fg-muted tabular">
              <span>
                <span className="text-fg">{formatUptime(activeDay.uptime)}</span> uptime
              </span>
              {activeDay.avgResponseMs !== null && <span>{formatMs(activeDay.avgResponseMs)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function UptimeBarsLegend({ days }: { days: number }) {
  return (
    <div className="mt-2 flex justify-between text-[11px] text-fg-subtle">
      <span className="max-sm:hidden">{days} days ago</span>
      <span className="sm:hidden">{MOBILE_DAYS} days ago</span>
      <span>Today</span>
    </div>
  );
}
