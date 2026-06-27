"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { AiResponseFeedback } from "@/components/ai/ai-response-feedback";
import { useAiAssistenteOps } from "@/hooks/use-ai-assistente-ops";

const QUICK_ICONS: Record<string, string> = {
  magazzino: "📦",
  cantina: "🍷",
  foodcost: "🍽",
  cucina: "👨‍🍳",
  prenotazioni: "📅",
  hotel: "🏨",
  turni: "👥",
  "report-day": "📊",
  "report-week": "📈",
  haccp: "🧹",
  costi: "💰",
  critici: "⚠",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-rw-surfaceAlt", className)} />;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="rounded-full border border-rw-line bg-rw-surfaceAlt px-2.5 py-1 text-xs font-medium text-rw-soft">
      {ok ? "🟢" : "🔴"} {label}
    </span>
  );
}

type Props = {
  onOpenChat: (context: string, presetMessage?: string) => void;
};

export function AiAssistenteOps({ onOpenChat }: Props) {
  const ops = useAiAssistenteOps();
  const d = ops.dashboard;

  if (ops.loading && !d) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1 — Stato AI */}
      <Card title="Stato AI" headerRight={d?.status.online ? <span className="text-xs text-emerald-400">Live</span> : null}>
        <div className="flex flex-wrap gap-2">
          <StatusPill ok={d?.status.online ?? false} label={d?.status.online ? "AI Online" : "AI Offline"} />
          <StatusPill ok={!!d?.status.streamingActive} label={`Streaming: ${d?.status.streamingActive ? "Attivo" : "Off"}`} />
          <StatusPill ok={!!d?.status.memoryActive} label={`Memory: ${d?.status.memoryActive ? "Attiva" : "Off"}`} />
          <StatusPill ok={!!d?.status.ragActive} label={`RAG: ${d?.status.ragActive ? "Attivo" : "Off"}`} />
          <StatusPill ok={!!d?.status.automationActive} label={`Automation: ${d?.status.automationActive ? "Attivo" : "Off"}`} />
          <StatusPill ok={!!d?.status.online} label={`Tool Calling: ${d?.status.online ? "Attivo" : "Off"}`} />
          <span className="rounded-full border border-rw-line px-2.5 py-1 text-xs text-rw-soft">
            Provider: {d?.status.provider ?? "—"}
          </span>
          <span className="rounded-full border border-rw-line px-2.5 py-1 text-xs text-rw-soft">
            Modello: {d?.status.model ?? "—"}
          </span>
          <span className="rounded-full border border-rw-line px-2.5 py-1 text-xs text-rw-soft">
            Aggiornato: {d ? new Date(d.generatedAt).toLocaleTimeString() : "—"}
          </span>
        </div>
        {ops.streamStatus && <p className="mt-2 text-xs text-rw-muted">{ops.streamStatus}</p>}
      </Card>

      {/* 2 — Azioni rapide */}
      <Card title="Azioni rapide">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ops.quickActions.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={ops.isQueryStreaming}
              onClick={() => ops.runQuery(a.query, a.contextHint)}
              className="flex min-h-[72px] flex-col items-start justify-center gap-1 rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-left transition hover:border-rw-accent/40 hover:bg-rw-accent/5 disabled:opacity-50"
              title={a.query}
            >
              <span className="text-sm font-semibold text-rw-ink">
                {QUICK_ICONS[a.id] ? `${QUICK_ICONS[a.id]} ` : ""}
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Risultato azione + streaming + feedback */}
      {(ops.isQueryStreaming || ops.activeResult) && (
        <Card
          title="Risposta AI"
          headerRight={
            ops.isQueryStreaming ? (
              <button type="button" onClick={ops.stopQuery} className="text-xs text-amber-400">
                Interrompi
              </button>
            ) : (
              <button type="button" onClick={ops.refresh} className="text-xs text-rw-muted hover:text-rw-ink">
                <RefreshCw className="inline h-3 w-3" />
              </button>
            )
          }
        >
          <p className="mb-2 text-xs text-rw-muted">{ops.activeResult?.query}</p>
          <div className="rounded-xl border border-rw-line bg-rw-bg px-4 py-3 text-sm leading-relaxed text-rw-ink whitespace-pre-wrap">
            {ops.isQueryStreaming ? (
              <>
                {ops.streamingText || ops.queryStatus || "AI sta analizzando…"}
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-rw-accent align-middle" />
              </>
            ) : (
              ops.activeResult?.reply
            )}
          </div>
          {ops.activeResult && !ops.isQueryStreaming && (
            <div className="mt-3 space-y-2">
              <AiResponseFeedback resultId={ops.activeResult.id} onFeedback={ops.saveFeedback} />
              <button
                type="button"
                onClick={() => onOpenChat(ops.activeResult!.contextHint, ops.activeResult!.query)}
                className="text-xs font-semibold text-rw-accent hover:underline"
              >
                Continua in chat →
              </button>
            </div>
          )}
        </Card>
      )}

      {/* 3 — Suggerimenti AI */}
      <Card title="Suggerimenti AI">
        {ops.suggestions.length === 0 ? (
          <p className="text-sm text-rw-muted">Nessun suggerimento critico al momento.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {ops.suggestions.map((s) => (
              <article
                key={s.id}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-rw-ink">{s.title}</p>
                    <p className="mt-1 text-xs text-rw-soft line-clamp-2">{s.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (s.proposalId) {
                      onOpenChat(s.module);
                      return;
                    }
                    ops.runQuery(s.query ?? s.message, s.module);
                  }}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl bg-rw-accent px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Play className="h-3 w-3" /> Esegui
                </button>
              </article>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* 4 — Automazioni */}
        <Card title="Automazioni disponibili">
          <DataTable
            columns={[
              { key: "module", header: "Modulo", render: (r) => r.module },
              { key: "enabled", header: "Stato", render: (r) => (r.enabled ? "Attiva" : "Off") },
              { key: "level", header: "Liv.", render: (r) => `L${r.level}` },
              {
                key: "last",
                header: "Ultima",
                render: (r) => (r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : "—"),
              },
              {
                key: "actions",
                header: "",
                render: (r) => (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => ops.toggleAutomation(r.module, r.enabled)}
                      className="rounded-lg border border-rw-line px-2 py-0.5 text-[10px] font-semibold uppercase"
                    >
                      {r.enabled ? "Disattiva" : "Attiva"}
                    </button>
                    <Link href="/ai-command-center" className="rounded-lg border border-rw-line px-2 py-0.5 text-[10px] font-semibold">
                      Apri
                    </Link>
                  </div>
                ),
              },
            ]}
            data={d?.automations ?? []}
            keyExtractor={(r) => r.module}
            emptyMessage="Nessuna automazione configurata"
          />
        </Card>

        {/* 5 — Decisioni recenti */}
        <Card title="Decisioni AI recenti">
          <DataTable
            columns={[
              { key: "module", header: "Modulo", render: (r) => r.module },
              { key: "decision", header: "Decisione", render: (r) => r.decision },
              {
                key: "conf",
                header: "Conf.",
                render: (r) => (r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"),
              },
              {
                key: "src",
                header: "Origine",
                render: (r) => [r.ruleBased && "Rules", r.openAi && "OpenAI", r.rag && "RAG"].filter(Boolean).join("+"),
              },
              { key: "status", header: "Stato", render: (r) => r.status },
            ]}
            data={(d?.decisions ?? []).slice(0, 8)}
            keyExtractor={(r) => r.id}
            emptyMessage="Nessuna decisione recente"
          />
        </Card>
      </div>

      {/* 6 — Approvazioni */}
      <Card title="Approvazioni richieste">
        {ops.proposals.length === 0 ? (
          <p className="text-sm text-rw-muted">Nessuna proposta in attesa.</p>
        ) : (
          <ul className="space-y-3">
            {ops.proposals.slice(0, 8).map((p) => (
              <li key={p.id} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-rw-ink">{p.title}</p>
                    <p className="mt-1 text-xs text-rw-soft">{p.summary}</p>
                    <p className="mt-1 text-[10px] uppercase text-rw-muted">{p.type} · {p.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => ops.reviewProposal(p.id, "approve")}
                      className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400"
                    >
                      Approva
                    </button>
                    <button
                      type="button"
                      onClick={() => ops.reviewProposal(p.id, "reject")}
                      className="rounded-xl bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400"
                    >
                      Rifiuta
                    </button>
                    <Link
                      href="/supervisor"
                      className="inline-flex items-center gap-1 rounded-xl border border-rw-line px-3 py-1.5 text-xs font-semibold text-rw-soft"
                    >
                      Dettaglio <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 7 — Timeline */}
      <Card title="Timeline AI">
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {(d?.timeline ?? []).slice(0, 15).map((ev) => (
            <li key={ev.id} className="flex items-start gap-2 rounded-xl border border-rw-line/60 px-3 py-2 text-sm">
              {ev.level === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              {ev.level === "warning" && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />}
              {ev.level === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
              {ev.level === "info" && <Bot className="h-4 w-4 shrink-0 text-rw-accent" />}
              <div className="min-w-0 flex-1">
                <p className="text-rw-ink">{ev.message}</p>
                <p className="text-[10px] text-rw-muted">
                  {new Date(ev.at).toLocaleString()}
                  {ev.module ? ` · ${ev.module}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* 8 — Feedback sessione */}
      {ops.actionHistory.length > 0 && (
        <Card title="Feedback AI — ultime risposte">
          <ul className="space-y-3">
            {ops.actionHistory.slice(0, 4).map((r) => (
              <li key={r.id} className="rounded-xl border border-rw-line p-3">
                <p className="text-xs text-rw-muted line-clamp-1">{r.query}</p>
                <AiResponseFeedback resultId={r.id} onFeedback={ops.saveFeedback} compact />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-rw-muted">
        <span className="inline-flex items-center gap-1">
          <Zap className="h-3 w-3" /> Aggiornamento realtime attivo
        </span>
        <Link href="/ai-command-center" className="inline-flex items-center gap-1 font-semibold text-rw-accent">
          AI Command Center <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
