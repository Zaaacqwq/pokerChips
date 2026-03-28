type Listener = (data: string) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribe(sessionId: string, listener: Listener): () => void {
  if (!channels.has(sessionId)) {
    channels.set(sessionId, new Set());
  }
  channels.get(sessionId)!.add(listener);

  return () => {
    const set = channels.get(sessionId);
    if (set) {
      set.delete(listener);
      if (set.size === 0) channels.delete(sessionId);
    }
  };
}

export function broadcast(sessionId: string, event: string, payload: unknown): void {
  const set = channels.get(sessionId);
  if (!set) return;
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const listener of set) {
    listener(data);
  }
}
