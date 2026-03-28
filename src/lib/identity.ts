const KEY_PREFIX = "poker-chips-";

interface SessionIdentity {
  hostToken?: string;
  playerToken?: string;
  playerId?: string;
  nickname?: string;
}

function getKey(sessionId: string): string {
  return `${KEY_PREFIX}session-${sessionId}`;
}

export function getIdentity(sessionId: string): SessionIdentity {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(getKey(sessionId));
  return raw ? JSON.parse(raw) : {};
}

export function saveHostIdentity(sessionId: string, hostToken: string): void {
  const current = getIdentity(sessionId);
  localStorage.setItem(
    getKey(sessionId),
    JSON.stringify({ ...current, hostToken })
  );
}

export function savePlayerIdentity(
  sessionId: string,
  playerId: string,
  playerToken: string,
  nickname: string
): void {
  const current = getIdentity(sessionId);
  localStorage.setItem(
    getKey(sessionId),
    JSON.stringify({ ...current, playerId, playerToken, nickname })
  );
}

export function isHost(sessionId: string): boolean {
  return !!getIdentity(sessionId).hostToken;
}

/** Get list of session IDs the user has visited */
export function getMySessionIds(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${KEY_PREFIX}session-`)) {
      keys.push(key.replace(`${KEY_PREFIX}session-`, ""));
    }
  }
  return keys;
}
