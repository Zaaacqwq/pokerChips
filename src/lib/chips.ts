export const DENOMINATIONS = [1, 5, 25, 100, 500, 1000] as const;

export type Denomination = (typeof DENOMINATIONS)[number];

export type ChipBreakdown = Readonly<Record<Denomination, number>>;

export function emptyBreakdown(): ChipBreakdown {
  return { 1: 0, 5: 0, 25: 0, 100: 0, 500: 0, 1000: 0 };
}

export function breakdownTotal(breakdown: ChipBreakdown): number {
  return DENOMINATIONS.reduce(
    (sum, d) => sum + d * (breakdown[d] || 0),
    0
  );
}

/**
 * Suggest a practical chip breakdown for a given total.
 *
 * Design: allocate a fixed percentage of value to small denominations (5s, 25s)
 * so the player has enough chips for betting, then fill the rest with the
 * largest denominations possible.  The percentages shrink as bigger
 * denominations come into play so you don't end up with 50 five-chips.
 */
export function suggestBreakdown(total: number): ChipBreakdown {
  const result: Record<Denomination, number> = { 1: 0, 5: 0, 25: 0, 100: 0, 500: 0, 1000: 0 };
  if (total <= 0) return result;

  // Step 1: always give some 1s
  result[1] = Math.min(10, total);
  let remaining = total - result[1];
  if (remaining <= 0) return result;

  const originalRemaining = remaining;

  // Step 2: choose allocation percentages based on which large denoms are reachable
  // Format: [fivePct, twentyfivePct, hundredPct] — rest goes to 500/1000 greedy
  let fivePct: number;
  let twentyfivePct: number;
  let hundredPct: number;

  if (originalRemaining >= 1000) {
    fivePct = 0.08;
    twentyfivePct = 0.12;
    hundredPct = 0.20;
  } else if (originalRemaining >= 500) {
    fivePct = 0.12;
    twentyfivePct = 0.18;
    hundredPct = 0.25;
  } else if (originalRemaining >= 100) {
    fivePct = 0.25;
    twentyfivePct = 0.35;
    hundredPct = 0;
  } else if (originalRemaining >= 25) {
    fivePct = 0.40;
    twentyfivePct = 0.60;
    hundredPct = 0;
  } else {
    fivePct = 1.0;
    twentyfivePct = 0;
    hundredPct = 0;
  }

  // Step 3: allocate 5s
  if (remaining >= 5) {
    const count = Math.max(1, Math.floor((originalRemaining * fivePct) / 5));
    result[5] = count;
    remaining -= count * 5;
  }

  // Step 4: allocate 25s
  if (remaining >= 25) {
    const count = Math.max(1, Math.floor((originalRemaining * twentyfivePct) / 25));
    result[25] = count;
    remaining -= count * 25;
  }

  // Step 5: allocate 100s (only for large buy-ins where 500/1000 are in play)
  if (hundredPct > 0 && remaining >= 100) {
    const count = Math.max(1, Math.floor((originalRemaining * hundredPct) / 100));
    result[100] = count;
    remaining -= count * 100;
  }

  // Step 6: fill the rest greedily with largest denominations
  for (const d of [1000, 500, 100] as const) {
    if (remaining >= d) {
      result[d] += Math.floor(remaining / d);
      remaining -= Math.floor(remaining / d) * d;
    }
  }

  // Step 7: any remainder back to 5s, then 1s
  if (remaining >= 5) {
    const extra = Math.floor(remaining / 5);
    result[5] += extra;
    remaining -= extra * 5;
  }
  result[1] += remaining;

  return result;
}

/** Chip colors for visual display */
export const CHIP_COLORS: Record<Denomination, string> = {
  1: "bg-gray-200 text-gray-800",
  5: "bg-red-500 text-white",
  25: "bg-green-600 text-white",
  100: "bg-black text-white",
  500: "bg-purple-600 text-white",
  1000: "bg-amber-500 text-white",
};
