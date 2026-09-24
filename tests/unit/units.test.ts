import { describe, expect, it } from "vitest";
import { convertWeight, displayWeight, roundGymWeight } from "@/lib/units";

describe("weight units", () => {
  it("uses the workbook conversion constant", () => {
    expect(convertWeight(1, "kg", "lbs")).toBeCloseTo(2.2046, 4);
    expect(convertWeight(2.2046, "lbs", "kg")).toBeCloseTo(1, 4);
  });

  it("rounds converted display weights to realistic gym increments", () => {
    expect(roundGymWeight(41.2, "kg")).toBe(41.25);
    expect(roundGymWeight(83.6, "lbs")).toBe(85);
    expect(displayWeight(37.5, "kg", "lbs")).toEqual({ value: 85, unit: "lbs", converted: true });
  });
});
