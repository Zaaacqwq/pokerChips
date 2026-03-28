import { describe, it, expect } from "vitest";
import {
  calculatePlayerSummary,
  checkBalance,
  type Transaction,
  type PlayerSummary,
} from "../balance";

describe("calculatePlayerSummary", () => {
  it("calculates single buyin correctly", () => {
    const transactions: Transaction[] = [
      { id: "1", playerId: "p1", type: "buyin", chips: 200 },
    ];
    const result = calculatePlayerSummary(transactions, "p1", 1.0);
    expect(result).toEqual({
      playerId: "p1",
      totalBuyinChips: 200,
      totalBuyinAmount: 200,
      cashoutChips: 0,
      cashoutAmount: 0,
      profitLoss: -200,
    });
  });

  it("calculates multiple rebuys correctly", () => {
    const transactions: Transaction[] = [
      { id: "1", playerId: "p1", type: "buyin", chips: 200 },
      { id: "2", playerId: "p1", type: "buyin", chips: 100 },
      { id: "3", playerId: "p1", type: "cashout", chips: 450 },
    ];
    const result = calculatePlayerSummary(transactions, "p1", 1.0);
    expect(result).toEqual({
      playerId: "p1",
      totalBuyinChips: 300,
      totalBuyinAmount: 300,
      cashoutChips: 450,
      cashoutAmount: 450,
      profitLoss: 150,
    });
  });

  it("applies chip rate correctly", () => {
    const transactions: Transaction[] = [
      { id: "1", playerId: "p1", type: "buyin", chips: 200 },
      { id: "2", playerId: "p1", type: "cashout", chips: 300 },
    ];
    const result = calculatePlayerSummary(transactions, "p1", 0.5);
    expect(result).toEqual({
      playerId: "p1",
      totalBuyinChips: 200,
      totalBuyinAmount: 100,
      cashoutChips: 300,
      cashoutAmount: 150,
      profitLoss: 50,
    });
  });

  it("ignores other players transactions", () => {
    const transactions: Transaction[] = [
      { id: "1", playerId: "p1", type: "buyin", chips: 200 },
      { id: "2", playerId: "p2", type: "buyin", chips: 300 },
      { id: "3", playerId: "p1", type: "cashout", chips: 100 },
    ];
    const result = calculatePlayerSummary(transactions, "p1", 1.0);
    expect(result.totalBuyinChips).toBe(200);
    expect(result.cashoutChips).toBe(100);
  });

  it("returns zero summary for player with no transactions", () => {
    const result = calculatePlayerSummary([], "p1", 1.0);
    expect(result).toEqual({
      playerId: "p1",
      totalBuyinChips: 0,
      totalBuyinAmount: 0,
      cashoutChips: 0,
      cashoutAmount: 0,
      profitLoss: 0,
    });
  });
});

describe("checkBalance", () => {
  it("returns balanced when buyin equals cashout", () => {
    const transactions: Transaction[] = [
      { id: "1", playerId: "p1", type: "buyin", chips: 200 },
      { id: "2", playerId: "p2", type: "buyin", chips: 300 },
      { id: "3", playerId: "p1", type: "cashout", chips: 100 },
      { id: "4", playerId: "p2", type: "cashout", chips: 400 },
    ];
    const result = checkBalance(transactions);
    expect(result).toEqual({
      totalBuyinChips: 500,
      totalCashoutChips: 500,
      difference: 0,
      isBalanced: true,
    });
  });

  it("returns unbalanced when cashout exceeds buyin", () => {
    const transactions: Transaction[] = [
      { id: "1", playerId: "p1", type: "buyin", chips: 200 },
      { id: "2", playerId: "p1", type: "cashout", chips: 300 },
    ];
    const result = checkBalance(transactions);
    expect(result.isBalanced).toBe(false);
    expect(result.difference).toBe(-100);
  });

  it("returns unbalanced when buyin exceeds cashout", () => {
    const transactions: Transaction[] = [
      { id: "1", playerId: "p1", type: "buyin", chips: 500 },
      { id: "2", playerId: "p1", type: "cashout", chips: 300 },
    ];
    const result = checkBalance(transactions);
    expect(result.isBalanced).toBe(false);
    expect(result.difference).toBe(200);
  });

  it("handles empty transactions", () => {
    const result = checkBalance([]);
    expect(result).toEqual({
      totalBuyinChips: 0,
      totalCashoutChips: 0,
      difference: 0,
      isBalanced: true,
    });
  });

  it("handles multiple players with rebuys", () => {
    const transactions: Transaction[] = [
      { id: "1", playerId: "p1", type: "buyin", chips: 200 },
      { id: "2", playerId: "p2", type: "buyin", chips: 200 },
      { id: "3", playerId: "p3", type: "buyin", chips: 200 },
      { id: "4", playerId: "p1", type: "buyin", chips: 100 }, // rebuy
      { id: "5", playerId: "p1", type: "cashout", chips: 400 },
      { id: "6", playerId: "p2", type: "cashout", chips: 50 },
      { id: "7", playerId: "p3", type: "cashout", chips: 250 },
    ];
    const result = checkBalance(transactions);
    expect(result.totalBuyinChips).toBe(700);
    expect(result.totalCashoutChips).toBe(700);
    expect(result.isBalanced).toBe(true);
  });
});
