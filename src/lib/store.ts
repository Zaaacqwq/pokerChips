import type { Session, Player, Transaction } from "./types";

const STORAGE_KEY = "poker-chips-sessions";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveSessions(sessions: readonly Session[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getSessions(): Session[] {
  return loadSessions();
}

export function getSession(id: string): Session | undefined {
  return loadSessions().find((s) => s.id === id);
}

export function createSession(
  name: string,
  chipRate: number,
  defaultBuyin: number
): Session {
  const session: Session = {
    id: generateRoomCode(),
    name,
    chipRate,
    defaultBuyin,
    status: "active",
    players: [],
    transactions: [],
    createdAt: new Date().toISOString(),
    settledAt: null,
  };
  const sessions = loadSessions();
  saveSessions([...sessions, session]);
  return session;
}

export function addPlayer(sessionId: string, nickname: string): Session {
  const sessions = loadSessions();
  const updated = sessions.map((s) => {
    if (s.id !== sessionId) return s;
    const player: Player = {
      id: generateId(),
      nickname,
      isActive: true,
    };
    return { ...s, players: [...s.players, player] };
  });
  saveSessions(updated);
  return updated.find((s) => s.id === sessionId)!;
}

export function addTransaction(
  sessionId: string,
  playerId: string,
  type: "buyin" | "cashout",
  chips: number,
  chipBreakdown?: Record<number, number>
): Session {
  const sessions = loadSessions();
  const updated = sessions.map((s) => {
    if (s.id !== sessionId) return s;
    const transaction: Transaction = {
      id: generateId(),
      playerId,
      type,
      chips,
      chipBreakdown,
      createdAt: new Date().toISOString(),
      voided: false,
    };
    return { ...s, transactions: [...s.transactions, transaction] };
  });
  saveSessions(updated);
  return updated.find((s) => s.id === sessionId)!;
}

export function voidTransaction(
  sessionId: string,
  transactionId: string
): Session {
  const sessions = loadSessions();
  const updated = sessions.map((s) => {
    if (s.id !== sessionId) return s;
    return {
      ...s,
      transactions: s.transactions.map((t) =>
        t.id === transactionId ? { ...t, voided: true } : t
      ),
    };
  });
  saveSessions(updated);
  return updated.find((s) => s.id === sessionId)!;
}

export function updateSessionStatus(
  sessionId: string,
  status: Session["status"]
): Session {
  const sessions = loadSessions();
  const updated = sessions.map((s) => {
    if (s.id !== sessionId) return s;
    return {
      ...s,
      status,
      settledAt: status === "completed" ? new Date().toISOString() : s.settledAt,
    };
  });
  saveSessions(updated);
  return updated.find((s) => s.id === sessionId)!;
}
