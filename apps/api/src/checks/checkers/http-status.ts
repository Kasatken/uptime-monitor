/**
 * Checks a status code against a spec like "200-299, 301, 418".
 * The spec format is validated by the shared zod schema before it gets here.
 */
export function matchesStatusSpec(status: number, spec: string): boolean {
  return spec.split(',').some((part) => {
    const [from, to] = part.split('-').map((value) => Number(value.trim()));
    if (from === undefined || Number.isNaN(from)) return false;
    return status >= from && status <= (to ?? from);
  });
}
