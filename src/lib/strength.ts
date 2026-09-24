export function brzyckiEstimated1RM(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return null;
  const denominator = 1.0278 - 0.0278 * reps;
  if (denominator <= 0) return null;
  return weight / denominator;
}

export function formatOneDecimal(value: number | null): string {
  return value === null ? "--" : value.toFixed(1);
}
