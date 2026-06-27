"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAiStreamText } from "@/hooks/use-ai-stream";
import { useAiCommandCenter } from "@/hooks/use-ai-command-center";
import {
  aiMemoryApi,
  aiOpsApi,
  aiCommandCenterApi,
  type AiProposal,
} from "@/lib/api-client";
import { deriveAiSuggestions, type AiSuggestion } from "@/lib/ai/ui/derive-suggestions";

export type QuickAction = {
  id: string;
  label: string;
  query: string;
  contextHint: string;
};

export const AI_QUICK_ACTIONS: QuickAction[] = [
  { id: "magazzino", label: "Riordina Magazzino", query: "Analizza stock e suggerisci riordini urgenti per il magazzino.", contextHint: "magazzino" },
  { id: "cantina", label: "Controlla Cantina", query: "Analizza cantina: giacenze, margini e riordini consigliati.", contextHint: "cantina" },
  { id: "foodcost", label: "Analizza Food Cost", query: "Analizza food cost, margini e piatti critici.", contextHint: "food_cost" },
  { id: "cucina", label: "Ottimizza Cucina", query: "Ottimizza flusso cucina, prep list e priorità comande.", contextHint: "cucina" },
  { id: "prenotazioni", label: "Controlla Prenotazioni", query: "Analizza prenotazioni, coperti e rischi operativi.", contextHint: "prenotazioni" },
  { id: "hotel", label: "Analizza Hotel", query: "Analizza occupazione, arrivi, partenze e housekeeping.", contextHint: "hotel" },
  { id: "turni", label: "Controlla Turni", query: "Analizza turni staff, copertura e ottimizzazioni.", contextHint: "turni" },
  { id: "report-day", label: "Report Giornaliero", query: "Genera report operativo giornaliero con KPI principali.", contextHint: "supervisor" },
  { id: "report-week", label: "Report Settimanale", query: "Genera report operativo settimanale con trend e raccomandazioni.", contextHint: "supervisor" },
  { id: "haccp", label: "HACCP", query: "Verifica stato HACCP, non conformità e azioni correttive.", contextHint: "haccp" },
  { id: "costi", label: "Analisi Costi", query: "Analizza costi operativi, sprechi e opportunità di risparmio.", contextHint: "supervisor" },
  { id: "critici", label: "Problemi Critici", query: "Elenca problemi critici operativi che richiedono intervento immediato.", contextHint: "supervisor" },
];

export type AiActionResult = {
  id: string;
  query: string;
  reply: string;
  at: string;
  contextHint: string;
};

export function useAiAssistenteOps() {
  const cc = useAiCommandCenter({ periodDays: 7 });
  const { streamFrom, isStreaming, statusText, text, setText, stop } = useAiStreamText();
  const [proposals, setProposals] = useState<AiProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [activeResult, setActiveResult] = useState<AiActionResult | null>(null);
  const [actionHistory, setActionHistory] = useState<AiActionResult[]>([]);
  const [memoryPrefs, setMemoryPrefs] = useState<Record<string, unknown>>({});

  const refreshProposals = useCallback(async () => {
    setLoadingProposals(true);
    try {
      const res = await aiOpsApi.proposals.list({ open: true, limit: 20 });
      setProposals(res.proposals);
    } catch {
      setProposals([]);
    } finally {
      setLoadingProposals(false);
    }
  }, []);

  useEffect(() => {
    refreshProposals();
    aiMemoryApi.profile().then((p) => setMemoryPrefs(p.preferences ?? {})).catch(() => undefined);
  }, [refreshProposals]);

  useEffect(() => {
    cc.startLive();
    return () => cc.stopLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestions = useMemo(
    () => deriveAiSuggestions(cc.dashboard, proposals),
    [cc.dashboard, proposals],
  );

  const runQuery = useCallback(
    async (query: string, contextHint: string) => {
      const id = `run-${Date.now()}`;
      setText("");
      setActiveResult({ id, query, reply: "", at: new Date().toISOString(), contextHint });
      await streamFrom(
        "/ai/orchestrator",
        { query, contextHint, stream: true, periodDays: 7, enrich: true },
        {
          onComplete: (reply) => {
            const result: AiActionResult = {
              id,
              query,
              reply,
              at: new Date().toISOString(),
              contextHint,
            };
            setActiveResult(result);
            setActionHistory((prev) => [result, ...prev].slice(0, 12));
          },
          onError: (msg) => {
            setActiveResult({
              id,
              query,
              reply: `Errore: ${msg}`,
              at: new Date().toISOString(),
              contextHint,
            });
          },
        },
      );
    },
    [streamFrom, setText],
  );

  const reviewProposal = useCallback(
    async (id: string, action: "approve" | "reject") => {
      await aiOpsApi.proposals.review(id, { action });
      await refreshProposals();
      cc.refresh();
    },
    [refreshProposals, cc],
  );

  const toggleAutomation = useCallback(
    async (module: string, enabled: boolean) => {
      await aiCommandCenterApi.updateAutomationConfig({ module, enabled: !enabled });
      cc.refresh();
    },
    [cc],
  );

  const saveFeedback = useCallback(
    async (params: {
      resultId: string;
      useful: boolean;
      correction?: string;
      remember?: boolean;
    }) => {
      const entry = {
        resultId: params.resultId,
        useful: params.useful,
        correction: params.correction ?? null,
        remember: params.remember ?? false,
        at: new Date().toISOString(),
      };
      const prev = Array.isArray(memoryPrefs.chatFeedback) ? memoryPrefs.chatFeedback : [];
      const nextPrefs = {
        ...memoryPrefs,
        chatFeedback: [entry, ...(prev as unknown[]).slice(0, 49)],
        ...(params.remember && params.correction
          ? { corrections: { ...(memoryPrefs.corrections as Record<string, string>), [params.resultId]: params.correction } }
          : {}),
      };
      const profile = await aiMemoryApi.updateProfile({ preferences: nextPrefs });
      setMemoryPrefs(profile.preferences ?? nextPrefs);
    },
    [memoryPrefs],
  );

  return {
    dashboard: cc.dashboard,
    loading: cc.loading || loadingProposals,
    error: cc.error,
    streamStatus: cc.streamStatus,
    refresh: () => {
      cc.refresh();
      refreshProposals();
    },
    proposals,
    suggestions,
    quickActions: AI_QUICK_ACTIONS,
    runQuery,
    stopQuery: stop,
    isQueryStreaming: isStreaming,
    queryStatus: statusText,
    streamingText: text,
    activeResult,
    actionHistory,
    reviewProposal,
    toggleAutomation,
    saveFeedback,
  };
}

export type { AiSuggestion };
