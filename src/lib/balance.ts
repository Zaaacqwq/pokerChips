export type TransactionType = "buyin" | "cashout";

export interface Transaction {
  id: string;
  playerId: string;
  type: TransactionType;
  chips: number;
}

export interface PlayerSummary {
  playerId: string;
  totalBuyinChips: number;
  totalBuyinAmount: number;
  cashoutChips: number;
  cashoutAmount: number;
  profitLoss: number;
}

export interface BalanceResult {
  totalBuyinChips: number;
  totalCashoutChips: number;
  difference: number;
  isBalanced: boolean;
}

export function calculatePlayerSummary(
  transactions: readonly Transaction[],
  playerId: string,
  chipRate: number
): PlayerSummary {
  const playerTxns = transactions.filter((t) => t.playerId === playerId);

  const totalBuyinChips = playerTxns
    .filter((t) => t.type === "buyin")
    .reduce((sum, t) => sum + t.chips, 0);

  const cashoutChips = playerTxns
    .filter((t) => t.type === "cashout")
    .reduce((sum, t) => sum + t.chips, 0);

  return {
    playerId,
    totalBuyinChips,
    totalBuyinAmount: totalBuyinChips * chipRate,
    cashoutChips,
    cashoutAmount: cashoutChips * chipRate,
    profitLoss: (cashoutChips - totalBuyinChips) * chipRate,
  };
}

export function checkBalance(
  transactions: readonly Transaction[]
): BalanceResult {
  const totalBuyinChips = transactions
    .filter((t) => t.type === "buyin")
    .reduce((sum, t) => sum + t.chips, 0);

  const totalCashoutChips = transactions
    .filter((t) => t.type === "cashout")
    .reduce((sum, t) => sum + t.chips, 0);

  const difference = totalBuyinChips - totalCashoutChips;

  return {
    totalBuyinChips,
    totalCashoutChips,
    difference,
    isBalanced: difference === 0,
  };
}
