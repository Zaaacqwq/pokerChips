import { describe, it, expect } from "vitest";
import { calculateSettlements, type PlayerBalance, type Settlement } from "../settlement";

describe("calculateSettlements", () => {
  it("returns empty array when no one owes anything", () => {
    const balances: PlayerBalance[] = [
      { playerId: "p1", profitLoss: 0 },
      { playerId: "p2", profitLoss: 0 },
    ];
    expect(calculateSettlements(balances)).toEqual([]);
  });

  it("handles simple two-player settlement", () => {
    const balances: PlayerBalance[] = [
      { playerId: "p1", profitLoss: 100 },
      { playerId: "p2", profitLoss: -100 },
    ];
    const result = calculateSettlements(balances);
    expect(result).toEqual([
      { from: "p2", to: "p1", amount: 100 },
    ]);
  });

  it("handles three players with minimum transfers", () => {
    // A wins 300, B wins 100, C loses 250, D loses 150
    const balances: PlayerBalance[] = [
      { playerId: "A", profitLoss: 300 },
      { playerId: "B", profitLoss: 100 },
      { playerId: "C", profitLoss: -250 },
      { playerId: "D", profitLoss: -150 },
    ];
    const result = calculateSettlements(balances);

    // Verify total transfers are correct
    const totalPaid: Record<string, number> = {};
    const totalReceived: Record<string, number> = {};
    for (const s of result) {
      totalPaid[s.from] = (totalPaid[s.from] || 0) + s.amount;
      totalReceived[s.to] = (totalReceived[s.to] || 0) + s.amount;
    }
    expect(totalPaid["C"]).toBe(250);
    expect(totalPaid["D"]).toBe(150);
    expect(totalReceived["A"]).toBe(300);
    expect(totalReceived["B"]).toBe(100);

    // Should minimize number of transfers (3 or fewer)
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("handles all players breaking even", () => {
    const balances: PlayerBalance[] = [
      { playerId: "p1", profitLoss: 0 },
      { playerId: "p2", profitLoss: 0 },
      { playerId: "p3", profitLoss: 0 },
    ];
    expect(calculateSettlements(balances)).toEqual([]);
  });

  it("handles single winner multiple losers", () => {
    const balances: PlayerBalance[] = [
      { playerId: "p1", profitLoss: 500 },
      { playerId: "p2", profitLoss: -200 },
      { playerId: "p3", profitLoss: -150 },
      { playerId: "p4", profitLoss: -150 },
    ];
    const result = calculateSettlements(balances);

    // All losers pay to single winner
    expect(result.length).toBe(3);
    for (const s of result) {
      expect(s.to).toBe("p1");
    }

    const totalToPay = result.reduce((sum, s) => sum + s.amount, 0);
    expect(totalToPay).toBe(500);
  });

  it("handles large group correctly", () => {
    const balances: PlayerBalance[] = [
      { playerId: "p1", profitLoss: 400 },
      { playerId: "p2", profitLoss: 200 },
      { playerId: "p3", profitLoss: -100 },
      { playerId: "p4", profitLoss: -200 },
      { playerId: "p5", profitLoss: -300 },
    ];
    const result = calculateSettlements(balances);

    // Verify net amounts
    const nets: Record<string, number> = {};
    for (const s of result) {
      nets[s.from] = (nets[s.from] || 0) - s.amount;
      nets[s.to] = (nets[s.to] || 0) + s.amount;
    }
    expect(nets["p1"]).toBe(400);
    expect(nets["p2"]).toBe(200);
    expect(nets["p3"]).toBe(-100);
    expect(nets["p4"]).toBe(-200);
    expect(nets["p5"]).toBe(-300);

    // Should need at most n-1 transfers
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it("produces no negative amounts", () => {
    const balances: PlayerBalance[] = [
      { playerId: "p1", profitLoss: 150 },
      { playerId: "p2", profitLoss: -50 },
      { playerId: "p3", profitLoss: -100 },
    ];
    const result = calculateSettlements(balances);
    for (const s of result) {
      expect(s.amount).toBeGreaterThan(0);
    }
  });

  it("handles decimal amounts with chip rate", () => {
    // After chip rate conversion, amounts might be decimals
    const balances: PlayerBalance[] = [
      { playerId: "p1", profitLoss: 75.5 },
      { playerId: "p2", profitLoss: -75.5 },
    ];
    const result = calculateSettlements(balances);
    expect(result).toEqual([
      { from: "p2", to: "p1", amount: 75.5 },
    ]);
  });
});
