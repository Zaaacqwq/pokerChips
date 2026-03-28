export interface PlayerBalance {
  playerId: string;
  profitLoss: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * Greedy algorithm to minimize the number of transfers.
 * Sorts creditors (winners) and debtors (losers) by amount,
 * then matches largest debtor with largest creditor.
 */
export function calculateSettlements(
  balances: readonly PlayerBalance[]
): Settlement[] {
  const creditors: { playerId: string; amount: number }[] = [];
  const debtors: { playerId: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.profitLoss > 0) {
      creditors.push({ playerId: b.playerId, amount: b.profitLoss });
    } else if (b.profitLoss < 0) {
      debtors.push({ playerId: b.playerId, amount: -b.profitLoss });
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const transfer = Math.min(creditors[ci].amount, debtors[di].amount);

    if (transfer > 0) {
      settlements.push({
        from: debtors[di].playerId,
        to: creditors[ci].playerId,
        amount: transfer,
      });
    }

    creditors[ci] = { ...creditors[ci], amount: creditors[ci].amount - transfer };
    debtors[di] = { ...debtors[di], amount: debtors[di].amount - transfer };

    if (creditors[ci].amount === 0) ci++;
    if (debtors[di].amount === 0) di++;
  }

  return settlements;
}
