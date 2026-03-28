import type { ChipBreakdown } from "./chips";

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data as T;
}

// --- Session ---

export interface ApiSession {
  id: string;
  name: string;
  chipRate: number;
  defaultBuyin: number;
  status: "active" | "settling" | "completed";
  createdAt: string;
  settledAt: string | null;
  players: ApiPlayer[];
  transactions: ApiTransaction[];
}

export interface ApiSessionWithToken extends ApiSession {
  hostToken: string;
}

export interface ApiPlayer {
  id: string;
  sessionId: string;
  nickname: string;
  isActive: boolean;
  joinedAt: string;
}

export interface ApiTransaction {
  id: string;
  sessionId: string;
  playerId: string;
  type: "buyin" | "cashout";
  chips: number;
  chipBreakdown: Record<number, number> | null;
  voided: boolean;
  createdAt: string;
}

export function createSession(
  name: string,
  chipRate: number,
  defaultBuyin: number
): Promise<ApiSessionWithToken> {
  return request("/sessions", {
    method: "POST",
    body: JSON.stringify({ name, chipRate, defaultBuyin }),
  });
}

export function getSession(id: string): Promise<ApiSession> {
  return request(`/sessions/${id}`);
}

export function joinSession(
  roomCode: string,
  nickname: string
): Promise<{ sessionId: string; playerId: string; playerToken: string; isRejoin: boolean }> {
  return request("/sessions/join", {
    method: "POST",
    body: JSON.stringify({ roomCode, nickname }),
  });
}

// --- Players ---

export function addPlayer(
  sessionId: string,
  nickname: string,
  hostToken: string
): Promise<ApiPlayer> {
  return request(`/sessions/${sessionId}/players`, {
    method: "POST",
    body: JSON.stringify({ nickname, hostToken }),
  });
}

// --- Transactions ---

export function addTransaction(
  sessionId: string,
  playerId: string,
  type: "buyin" | "cashout",
  chips: number,
  chipBreakdown?: ChipBreakdown,
  auth?: { hostToken?: string; playerToken?: string }
): Promise<ApiTransaction> {
  return request(`/sessions/${sessionId}/transactions`, {
    method: "POST",
    body: JSON.stringify({
      playerId,
      type,
      chips,
      chipBreakdown,
      hostToken: auth?.hostToken,
      playerToken: auth?.playerToken,
    }),
  });
}

export function voidTransaction(
  sessionId: string,
  txId: string,
  hostToken: string
): Promise<ApiTransaction> {
  return request(`/sessions/${sessionId}/transactions/${txId}`, {
    method: "PATCH",
    body: JSON.stringify({ hostToken }),
  });
}

// --- Settle ---

export function updateSessionStatus(
  sessionId: string,
  status: "active" | "settling" | "completed",
  hostToken: string
): Promise<ApiSession> {
  return request(`/sessions/${sessionId}/settle`, {
    method: "PATCH",
    body: JSON.stringify({ status, hostToken }),
  });
}
