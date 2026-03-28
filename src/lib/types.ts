export interface Player {
  readonly id: string;
  readonly nickname: string;
  readonly isActive: boolean;
}

export interface Transaction {
  readonly id: string;
  readonly playerId: string;
  readonly type: "buyin" | "cashout";
  readonly chips: number;
  readonly chipBreakdown?: Readonly<Record<number, number>>;
  readonly createdAt: string;
  readonly voided: boolean;
}

export interface Session {
  readonly id: string;
  readonly name: string;
  readonly chipRate: number;
  readonly defaultBuyin: number;
  readonly status: "active" | "settling" | "completed";
  readonly players: readonly Player[];
  readonly transactions: readonly Transaction[];
  readonly createdAt: string;
  readonly settledAt: string | null;
}

export interface Settlement {
  readonly from: string;
  readonly to: string;
  readonly amount: number;
}
