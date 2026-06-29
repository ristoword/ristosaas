"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AiEnterpriseControlPayload } from "@/lib/api-client";

export function useAiControlCenter() {
  const [data, setData] = useState<AiEnterpriseControlPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async (params?: { tenantId?: string; q?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api.admin.aiControl.get(params);
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento AI Enterprise Control Center");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => refresh(), 45_000);
    return () => clearInterval(id);
  }, [refresh]);

  const createAgent = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy("agent");
      try {
        await api.admin.aiControl.createAgent(body);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const updateAgent = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy("agent");
      try {
        await api.admin.aiControl.updateAgent(body);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const deleteAgent = useCallback(
    async (id: string) => {
      setBusy("agent");
      try {
        await api.admin.aiControl.deleteAgent(id);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const updatePrompt = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setBusy("prompt");
      try {
        await api.admin.aiControl.updatePrompt(id, body);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const rollbackPrompt = useCallback(
    async (id: string, version: number) => {
      setBusy("prompt");
      try {
        await api.admin.aiControl.updatePrompt(id, { action: "rollback", version });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const duplicatePrompt = useCallback(
    async (id: string, newKey: string) => {
      setBusy("prompt");
      try {
        await api.admin.aiControl.updatePrompt(id, { action: "duplicate", newKey });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const importPrompts = useCallback(
    async (templates: unknown[]) => {
      setBusy("prompt");
      try {
        await api.admin.aiControl.importPrompts({ templates });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const deleteEmbedding = useCallback(
    async (id: string) => {
      setBusy("embedding");
      try {
        await api.admin.aiControl.deleteEmbedding(id);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const reindexDocument = useCallback(
    async (documentId: string) => {
      setBusy("embedding");
      try {
        await api.admin.aiControl.reindexDocument(documentId);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const marketplaceAction = useCallback(
    async (action: "install" | "uninstall", marketplaceId: string, tenantId: string) => {
      setBusy("marketplace");
      try {
        await api.admin.aiControl.marketplaceAction({ action, marketplaceId, tenantId });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  return {
    data,
    loading,
    error,
    busy,
    refresh,
    createAgent,
    updateAgent,
    deleteAgent,
    updatePrompt,
    rollbackPrompt,
    duplicatePrompt,
    importPrompts,
    deleteEmbedding,
    reindexDocument,
    marketplaceAction,
  };
}
