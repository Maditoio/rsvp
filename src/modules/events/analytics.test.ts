import { describe, expect, it } from "vitest";

function conversionRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

describe("event analytics helpers", () => {
  it("computes conversion rate as one decimal percent", () => {
    expect(conversionRate(25, 100)).toBe(25);
    expect(conversionRate(1, 3)).toBe(33.3);
    expect(conversionRate(0, 0)).toBeNull();
  });
});
