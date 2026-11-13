export function matchesStatusSpec(status: number, spec: string): boolean {
  return spec.split(',').some((part) => {
    const [from, to] = part.split('-').map((value) => Number(value.trim()));
    if (from === undefined || Number.isNaN(from)) return false;
    return status >= from && status <= (to ?? from);
  });
}
