import type { DailyUptimeDto } from '@vigil/shared';
import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { formatMs, formatUptime } from '../../lib/format';
import { formatDay } from '../../lib/time';
import { uptimeTone } from '../status';

const MOBILE_DAYS = 30;

function describeDay(day: DailyUptimeDto): string {
  if (day.uptime === null) return `${formatDay(day.day)}: нет данных`;
  const response = day.avgResponseMs !== null ? `, в среднем ${formatMs(day.avgResponseMs)}` : '';
  return `${formatDay(day.day)}: аптайм ${formatUptime(day.uptime)}${response}`;
}

// Semantically a slider over days: screen readers announce each day through aria-valuetext.
export function UptimeBars({ days, label }: { days: DailyUptimeDto[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [tooltipX, setTooltipX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const last = days.length - 1;
  const current = days[active ?? last];

  const activate = (index: number) => {
    const bar = barRefs.current[index];
    if (!bar) return;
    setActive(index);
    setTooltipX(bar.offsetLeft + bar.offsetWidth / 2);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const from = active ?? last;
    const next = { ArrowLeft: from - 1, ArrowRight: from + 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    activate(Math.min(Math.max(next, 0), last));
  };

  const onPointerMove = (event: PointerEvent) => {
    const x = event.clientX - (containerRef.current?.getBoundingClientRect().left ?? 0);
    const index = barRefs.current.findIndex(
      (bar) => bar && bar.offsetWidth > 0 && x <= bar.offsetLeft + bar.offsetWidth + 1,
    );
    if (index !== -1 && index !== active) activate(index);
  };

  const activeDay = active !== null ? days[active] : undefined;
  const containerWidth = containerRef.current?.clientWidth ?? 0;
  const align = tooltipX < 90 ? 'left' : tooltipX > containerWidth - 90 ? 'right' : 'center';

  return (
    <div className="relative">
      <div
        ref={containerRef}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={active ?? last}
        aria-valuetext={current ? describeDay(current) : undefined}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => active === null && activate(last)}
        onBlur={() => setActive(null)}
        className="flex h-10 touch-none items-stretch gap-[3px] rounded-full"
      >
        {days.map((day, index) => (
          <span
            key={day.day}
            ref={(element) => {
              barRefs.current[index] = element;
            }}
            className={cn(
              'flex-1 rounded-full transition-opacity',
              uptimeTone(day.uptime),
              active !== null && active !== index && 'opacity-40',
              index < days.length - MOBILE_DAYS && 'max-sm:hidden',
            )}
          />
        ))}
      </div>

      {activeDay && (
        <div
          className={cn(
            'pointer-events-none absolute bottom-full z-10 mb-2.5 w-max max-w-60 rounded-2xl bg-night px-3.5 py-2.5 text-xs text-white shadow-xl',
            align === 'center' && '-translate-x-1/2',
            align === 'right' && '-translate-x-full',
          )}
          style={{ left: align === 'left' ? 0 : align === 'right' ? '100%' : tooltipX }}
        >
          <div className="font-semibold">{formatDay(activeDay.day)}</div>
          {activeDay.uptime === null ? (
            <div className="text-white/60">Нет данных</div>
          ) : (
            <div className="mt-0.5 flex gap-3 text-white/60 tabular">
              <span>
                <span className="font-semibold text-lime">{formatUptime(activeDay.uptime)}</span>{' '}
                аптайм
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
    <div className="mt-2.5 flex justify-between text-xs text-fg-subtle">
      <span className="max-sm:hidden">{days} дней назад</span>
      <span className="sm:hidden">{MOBILE_DAYS} дней назад</span>
      <span>Сегодня</span>
    </div>
  );
}
