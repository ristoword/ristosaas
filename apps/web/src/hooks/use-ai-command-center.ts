"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { consumeAiStream } from "@/lib/ai/consume-ai-stream";
import { aiCommandCenterApi, type CommandCenterDashboard, type CommandCenterFilters } from "@/lib/api-client";

export function useAiCommandCenter(initialFilters?: CommandCenterFilters) {
  const [filters, setFilters] = useState<CommandCenterFilters>(initialFilters ?? { periodDays: 30 });
  const [dashboard, setDashboard] = useState<CommandCenterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiCommandCenterApi.dashboard(filters);
      setDashboard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento Command Center");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startLive = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLive(true);

    consumeAiStream(
      "/ai/command-center/stream",
      { ...filters },
      {
        onStatus: (msg) => setStreamStatus(msg),
        onMeta: (data) => {
          setDashboard((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              generatedAt: String(data.generatedAt ?? prev.generatedAt),
              status: (data.status as CommandCenterDashboard["status"]) ?? prev.status,
              kpis: (data.kpis as CommandCenterDashboard["kpis"]) ?? prev.kpis,
              timeline: [
                ...((data.timeline as CommandCenterDashboard["timeline"]) ?? []),
                ...prev.timeline,
              ].slice(0, 30),
              workflowsLive:
                (data.workflowsLive as CommandCenterDashboard["workflowsLive"]) ?? prev.workflowsLive,
            };
          });
        },
        onError: (msg) => setStreamStatus(msg),
        onDone: () => setLive(false),
      },
      controller.signal,
    ).catch(() => setLive(false));
  }, [filters]);

  const stopLive = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLive(false);
    setStreamStatus(null);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    dashboard,
    loading,
    error,
    filters,
    setFilters,
    refresh,
    live,
    streamStatus,
    startLive,
    stopLive,
    exportCsv: () => aiCommandCenterApi.exportUrl({ ...filters, format: "csv" }),
    exportPdf: () => aiCommandCenterApi.exportUrl({ ...filters, format: "pdf" }),
  };
}
