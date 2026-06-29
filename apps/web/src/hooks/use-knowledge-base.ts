"use client";

import { useCallback, useEffect, useState } from "react";

export type KnowledgeDocument = {
  id: string;
  tenantId: string | null;
  title: string;
  module: string;
  category: string;
  mimeType: string;
  language: string;
  sourceKind: string;
  status: string;
  chunkCount: number;
  lastIndexedAt: string | null;
  lastError: string | null;
  fileName: string | null;
  authorName: string | null;
  version: number;
  updatedAt: string;
};

export type KnowledgeStats = {
  toggles: Record<string, boolean>;
  knowledge: Record<string, unknown>;
  vector: Record<string, unknown>;
  jobs: unknown[];
  audit: unknown[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json.data ?? json;
}

export function useKnowledgeBase() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<unknown[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, st] = await Promise.all([
        api<{ items: KnowledgeDocument[] }>(`/api/ai/knowledge?limit=100${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ""}`),
        api<KnowledgeStats>("/api/ai/knowledge/stats"),
      ]);
      setDocuments(list.items);
      setStats(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [searchQ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (payload: {
      title: string;
      module: string;
      category?: string;
      fileName?: string;
      mimeType?: string;
      contentText?: string;
      contentBase64?: string;
    }) => {
      await api("/api/ai/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await api(`/api/ai/knowledge/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh],
  );

  const reindex = useCallback(
    async (action: string, documentId?: string) => {
      await api("/api/ai/knowledge/reindex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, documentId }),
      });
      await refresh();
    },
    [refresh],
  );

  const semanticSearch = useCallback(async (query: string) => {
    const result = await api<{ hits: unknown[] }>("/api/ai/knowledge/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    setSearchResults(result.hits);
    return result;
  }, []);

  return {
    documents,
    stats,
    loading,
    error,
    searchQ,
    setSearchQ,
    searchResults,
    refresh,
    upload,
    remove,
    reindex,
    semanticSearch,
  };
}
