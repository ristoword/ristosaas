"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AiConfigCenterPayload } from "@/lib/api-client";

export function useAiConfigCenter() {
  const [data, setData] = useState<AiConfigCenterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [ragBusy, setRagBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api.admin.aiConfig.get();
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento AI Configuration Center");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const setToggle = useCallback(
    async (key: string, value: boolean) => {
      setSaving(key);
      try {
        const payload = await api.admin.aiConfig.update({ [key]: value });
        setData(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore salvataggio");
      } finally {
        setSaving(null);
      }
    },
    [],
  );

  const ragAction = useCallback(
    async (action: string) => {
      setRagBusy(true);
      setError(null);
      try {
        await api.admin.aiConfig.ragAction(action);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore azione RAG");
      } finally {
        setRagBusy(false);
      }
    },
    [refresh],
  );

  return { data, loading, error, saving, ragBusy, refresh, setToggle, ragAction };
}
