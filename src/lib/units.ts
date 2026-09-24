export type WeightUnit = "kg" | "lbs";

export const KG_TO_LBS = 2.2046;

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === "kg" ? value * KG_TO_LBS : value / KG_TO_LBS;
}

export function roundGymWeight(value: number, unit: WeightUnit): number {
  const increment = unit === "kg" ? 1.25 : 5;
  return Math.round(value / increment) * increment;
}

export function formatWeight(value: number | null, unit: WeightUnit | null): string {
  if (value === null || unit === null) return "--";
  const digits = Number.isInteger(value) ? 0 : 2;
  return `${value.toFixed(digits).replace(/\.00$/, "")} ${unit}`;
}

export function displayWeight(
  value: number | null,
  sourceUnit: WeightUnit | null,
  preferredUnit: WeightUnit,
): { value: number | null; unit: WeightUnit | null; converted: boolean } {
  if (value === null || sourceUnit === null) return { value, unit: sourceUnit, converted: false };
  if (sourceUnit === preferredUnit) return { value, unit: sourceUnit, converted: false };
  return {
    value: roundGymWeight(convertWeight(value, sourceUnit, preferredUnit), preferredUnit),
    unit: preferredUnit,
    converted: true,
  };
}
