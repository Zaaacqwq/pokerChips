"use client";

import { useEffect, useRef } from "react";

type EventHandler = (data: unknown) => void;

export function useSessionEvents(
  sessionId: string | null,
  onEvent: EventHandler
) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!sessionId) return;

    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(`/api/sessions/${sessionId}/events`);

      es.addEventListener("player_joined", (e) => {
        handlerRef.current(JSON.parse(e.data));
      });

      es.addEventListener("transaction_added", (e) => {
        handlerRef.current(JSON.parse(e.data));
      });

      es.addEventListener("transaction_voided", (e) => {
        handlerRef.current(JSON.parse(e.data));
      });

      es.addEventListener("status_changed", (e) => {
        handlerRef.current(JSON.parse(e.data));
      });

      es.onerror = () => {
        es?.close();
        // Reconnect after 3s
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      es?.close();
    };
  }, [sessionId]);
}
