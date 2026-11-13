// Floors instead of rounding: 99.996% must never show up as a fake 100.00%.
export function formatUptime(ratio: number | null): string {
  if (ratio === null) return '—';
  if (ratio >= 1) return '100%';
  const floored = Math.floor(ratio * 10_000) / 100;
  return `${floored.toFixed(2).replace('.', ',')}%`;
}

export function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)} мс`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1).replace('.', ',')} с`;
}

const pluralRules = new Intl.PluralRules('ru-RU');

export function plural(count: number, [one, few, many]: [string, string, string]): string {
  const rule = pluralRules.select(count);
  if (rule === 'one') return one;
  if (rule === 'few') return few;
  return many;
}

export function greeting(hour = new Date().getHours()): string {
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 18) return 'Добрый день';
  if (hour >= 18) return 'Добрый вечер';
  return 'Доброй ночи';
}
