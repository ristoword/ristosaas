"use client";

import { useEffect } from "react";

type Options = {
  onUpdate: () => void;
  enabled?: boolean;
};

/** SSE folio stream — sostituisce polling 30s. */
export function useFolioStream({ onUpdate, enabled = true }: Options) {
  useEffect(() => {
    if (!enabled) return;
    let es: EventSource | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => onUpdate(), 300);
    };

    try {
      es = new EventSource("/api/hotel/folio/stream");
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as { type: string };
          if (data.type === "folio_updated") scheduleRefresh();
        } catch {
          scheduleRefresh();
        }
      };
      es.onerror = () => {
        es?.close();
      };
    } catch {
      /* SSE non disponibile */
    }

    return () => {
      if (debounce) clearTimeout(debounce);
      es?.close();
    };
  }, [onUpdate, enabled]);
}
