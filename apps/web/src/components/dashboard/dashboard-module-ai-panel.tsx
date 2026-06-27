"use client";

import Link from "next/link";
import { Brain, History, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModuleAiInsight } from "@/hooks/use-dashboard-module-ai";

type Props = {
  navId: string;
  label: string;
  insight: ModuleAiInsight | undefined;
  loading: boolean;
};

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", ok ? "bg-emerald-400" : "bg-red-400")}
      title={ok ? "AI online" : "AI offline"}
    />
  );
}

export function DashboardModuleAiPanel({ navId, label, insight, loading }: Props) {
  if (loading && !insight) {
    return (
      <div className="mt-4 space-y-2 border-t border-rw-line pt-4">
        <div className="h-3 w-24 animate-pulse rounded bg-rw-surfaceAlt" />
        <div className="h-8 animate-pulse rounded bg-rw-surfaceAlt" />
      </div>
    );
  }

  if (!insight) return null;

  const chatContext = insight.aiModule;

  return (
    <div className="mt-4 space-y-3 border-t border-rw-line pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rw-ink">
          <Dot ok={insight.aiOnline} /> Stato AI
        </span>
        {insight.automationLevel != null && (
          <span className="rounded-full bg-rw-accent/10 px-2 py-0.5 text-[10px] font-semibold text-rw-accent">
            Auto L{insight.automationLevel}
          </span>
        )}
        {insight.alerts > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            {insight.alerts} alert
          </span>
        )}
        {insight.pendingApprovals > 0 && (
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
            {insight.pendingApprovals} approvazioni
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-rw-muted">
        <span>Workflow attivi: <strong className="text-rw-soft">{insight.activeWorkflows}</strong></span>
        <span>Automazioni: <strong className="text-rw-soft">{insight.automationsCount}</strong></span>
        <span>Decisioni oggi: <strong className="text-rw-soft">{insight.decisionsToday}</strong></span>
        <span>Suggerimenti: <strong className="text-rw-soft">{insight.suggestions}</strong></span>
        <span>Tempo medio AI: <strong className="text-rw-soft">{insight.avgResponseMs}ms</strong></span>
        <span>Aggiornato: <strong className="text-rw-soft">{insight.lastUpdate ? new Date(insight.lastUpdate).toLocaleTimeString() : "—"}</strong></span>
      </div>

      {insight.lastIntervention && (
        <p className="text-[11px] text-rw-soft line-clamp-2" title={insight.lastIntervention}>
          Ultimo intervento: {insight.lastIntervention}
        </p>
      )}

      {insight.extras.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {insight.extras.slice(0, 6).map((e) => (
            <div key={e.label} className="rounded-lg bg-rw-surfaceAlt px-2 py-1.5" title={e.label}>
              <p className="text-[10px] text-rw-muted">{e.label}</p>
              <p className="text-xs font-semibold text-rw-ink">{e.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={`/ai-assistente?context=${encodeURIComponent(chatContext)}`}
          className="inline-flex items-center gap-1 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-rw-accent transition hover:bg-rw-accent/20"
          onClick={(e) => e.stopPropagation()}
        >
          <Sparkles className="h-3 w-3" /> Apri AI
        </Link>
        <Link
          href={`/ai-command-center?module=${encodeURIComponent(insight.aiModule)}`}
          className="inline-flex items-center gap-1 rounded-xl border border-rw-line px-2.5 py-1.5 text-[11px] font-semibold text-rw-soft transition hover:border-rw-accent/30"
          onClick={(e) => e.stopPropagation()}
        >
          <Brain className="h-3 w-3" /> Command Center
        </Link>
        <Link
          href={`/supervisor?tab=${navId === "supervisor" ? "overview" : "reports"}`}
          className="inline-flex items-center gap-1 rounded-xl border border-rw-line px-2.5 py-1.5 text-[11px] font-semibold text-rw-soft transition hover:border-rw-accent/30"
          onClick={(e) => e.stopPropagation()}
        >
          <History className="h-3 w-3" /> Storico
        </Link>
      </div>
    </div>
  );
}

export function DashboardModuleAiSkeleton() {
  return (
    <div className="mt-4 flex items-center gap-2 border-t border-rw-line pt-4 text-xs text-rw-muted">
      <Loader2 className="h-3 w-3 animate-spin" /> Caricamento dati AI…
    </div>
  );
}
