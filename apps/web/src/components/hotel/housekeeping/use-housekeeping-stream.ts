"use client";

import { useCallback, useEffect, useRef } from "react";

export function useHousekeepingStream(onUpdate: () => void, enabled = true) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void onUpdateRef.current();
    }, 400);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource("/api/hotel/housekeeping/stream");

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string };
        if (data.type === "hk_updated") scheduleRefresh();
      } catch {
        /* ignore */
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, scheduleRefresh]);
}
