'use client';

import { useEffect, useRef } from 'react';

export function useSSE(
  onEvent: (event: Record<string, unknown>) => void,
  enabled = true,
) {
  // Always call the latest version of the handler without reconnecting
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource('/api/events');

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as Record<string, unknown>;
        if (data.type !== 'connected') handlerRef.current(data);
      } catch { /* malformed frame — ignore */ }
    };

    // EventSource auto-reconnects on error; no manual handling needed
    return () => es.close();
  }, [enabled]);
}
