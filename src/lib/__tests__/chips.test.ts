import { describe, it, expect } from "vitest";
import { emptyBreakdown, breakdownTotal, suggestBreakdown } from "../chips";

describe("chips", () => {
  it("emptyBreakdown returns all zeros", () => {
    const b = emptyBreakdown();
    expect(b).toEqual({ 1: 0, 5: 0, 25: 0, 100: 0, 500: 0, 1000: 0 });
  });

  it("breakdownTotal calculates correctly", () => {
    expect(breakdownTotal({ 1: 3, 5: 2, 25: 1, 100: 0, 500: 0, 1000: 0 })).toBe(38);
  });

  it("breakdownTotal with all denominations", () => {
    expect(
      breakdownTotal({ 1: 1, 5: 1, 25: 1, 100: 1, 500: 1, 1000: 1 })
    ).toBe(1631);
  });

  it("breakdownTotal with empty breakdown is 0", () => {
    expect(breakdownTotal(emptyBreakdown())).toBe(0);
  });
});

describe("suggestBreakdown", () => {
  it("returns empty for 0", () => {
    expect(suggestBreakdown(0)).toEqual(emptyBreakdown());
  });

  it("returns empty for negative", () => {
    expect(suggestBreakdown(-10)).toEqual(emptyBreakdown());
  });

  it("handles small amount (all 1s)", () => {
    const b = suggestBreakdown(7);
    expect(breakdownTotal(b)).toBe(7);
    expect(b[1]).toBe(7);
  });

  it("total always matches input for 300", () => {
    const b = suggestBreakdown(300);
    expect(breakdownTotal(b)).toBe(300);
  });

  it("total always matches input for 200", () => {
    const b = suggestBreakdown(200);
    expect(breakdownTotal(b)).toBe(200);
  });

  it("total always matches input for 1000", () => {
    const b = suggestBreakdown(1000);
    expect(breakdownTotal(b)).toBe(1000);
  });

  it("total always matches input for 50", () => {
    const b = suggestBreakdown(50);
    expect(breakdownTotal(b)).toBe(50);
  });

  it("total always matches input for 2000", () => {
    const b = suggestBreakdown(2000);
    expect(breakdownTotal(b)).toBe(2000);
  });

  it("uses multiple denominations for 300", () => {
    const b = suggestBreakdown(300);
    const denomsUsed = [1, 5, 25, 100, 500, 1000].filter(
      (d) => b[d as keyof typeof b] > 0
    );
    expect(denomsUsed.length).toBeGreaterThanOrEqual(3);
  });

  it("always includes 1s for amounts >= 10", () => {
    for (const amount of [10, 50, 100, 300, 500, 1000]) {
      const b = suggestBreakdown(amount);
      expect(b[1]).toBeGreaterThan(0);
    }
  });

  it("no denomination count is negative", () => {
    for (const amount of [1, 5, 13, 50, 99, 200, 300, 777, 1000, 2500]) {
      const b = suggestBreakdown(amount);
      for (const d of [1, 5, 25, 100, 500, 1000] as const) {
        expect(b[d]).toBeGreaterThanOrEqual(0);
      }
      expect(breakdownTotal(b)).toBe(amount);
    }
  });

  it("handles amount not divisible by 5", () => {
    const b = suggestBreakdown(13);
    expect(breakdownTotal(b)).toBe(13);
    expect(b[1]).toBeGreaterThanOrEqual(3);
  });
});
