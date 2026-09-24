import { describe, expect, it } from "vitest";
import { brzyckiEstimated1RM } from "@/lib/strength";

describe("Brzycki estimated 1RM", () => {
  it("matches the workbook formula", () => {
    expect(brzyckiEstimated1RM(50, 5)).toBeCloseTo(56.25562556, 6);
  });

  it("does not fabricate a value when inputs are invalid", () => {
    expect(brzyckiEstimated1RM(0, 5)).toBeNull();
    expect(brzyckiEstimated1RM(50, 0)).toBeNull();
    expect(brzyckiEstimated1RM(50, 40)).toBeNull();
  });
});
