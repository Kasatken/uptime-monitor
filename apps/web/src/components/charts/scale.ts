export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

export const linear =
  (domain: [number, number], range: [number, number]) =>
  (value: number): number => {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    if (d1 === d0) return (r0 + r1) / 2;
    return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  };

export function nearestIndex(xs: number[], target: number): number {
  let low = 0;
  let high = xs.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if ((xs[mid] as number) < target) low = mid;
    else high = mid;
  }
  return Math.abs((xs[low] as number) - target) <= Math.abs((xs[high] as number) - target)
    ? low
    : high;
}
