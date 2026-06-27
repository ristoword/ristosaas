"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  Download,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { useAiCommandCenter } from "@/hooks/use-ai-command-center";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full", ok ? "bg-emerald-400" : "bg-red-400")}
      aria-hidden
    />
  );
}

function HealthBadge({ status }: { status: string }) {
  const color =
    status === "green" ? "text-emerald-400 bg-emerald-500/10" : status === "yellow" ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10";
  return <span className={cn("rounded-lg px-2 py-0.5 text-xs font-semibold", color)}>{status}</span>;
}

function MiniBarChart({ data, color = "bg-rw-accent" }: { data: Array<{ date: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-24 items-end gap-0.5">
      {data.slice(-30).map((p) => (
        <div
          key={p.date}
          className={cn("min-w-[4px] flex-1 rounded-t opacity-80", color)}
          style={{ height: `${Math.max(4, (p.value / max) * 100)}%` }}
          title={`${p.date}: ${p.value}`}
        />
      ))}
    </div>
  );
}

function KpiTile({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
      <p className="text-xs text-rw-muted">{label}</p>
      <p className="font-display text-lg font-semibold text-rw-ink">
        {value}
        {suffix && <span className="ml-1 text-xs font-normal text-rw-muted">{suffix}</span>}
      </p>
    </div>
  );
}

export function AiCommandCenterPage() {
  const { t } = useI18n();
  const { dashboard, loading, error, filters, setFilters, refresh, live, streamStatus, startLive, stopLive, exportCsv, exportPdf } =
    useAiCommandCenter();
  const [logSearch, setLogSearch] = useState("");

  const filteredLogs = useMemo(() => {
    if (!dashboard?.logs) return [];
    const q = logSearch.trim().toLowerCase();
    if (!q) return dashboard.logs;
    return dashboard.logs.filter((l) => l.message.toLowerCase().includes(q) || l.module.toLowerCase().includes(q));
  }, [dashboard?.logs, logSearch]);

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-rw-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("aiCommandCenter.loading")}
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
        {error}
      </div>
    );
  }

  if (!dashboard) return null;

  const d = dashboard;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("aiCommandCenter.title")} subtitle={t("aiCommandCenter.subtitle")}>
        <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={refresh} className="rounded-xl border border-rw-line px-3 py-1.5 text-sm text-rw-ink hover:bg-rw-surfaceAlt">
              <RefreshCw className="mr-1 inline h-4 w-4" />
              {t("aiCommandCenter.refresh")}
            </button>
            {live ? (
              <button type="button" onClick={stopLive} className="rounded-xl bg-amber-500/15 px-3 py-1.5 text-sm font-semibold text-amber-400">
                <Pause className="mr-1 inline h-4 w-4" />
                Live
              </button>
            ) : (
              <button type="button" onClick={startLive} className="rounded-xl bg-rw-accent/15 px-3 py-1.5 text-sm font-semibold text-rw-accent">
                <Play className="mr-1 inline h-4 w-4" />
                Realtime
              </button>
            )}
            <a href={exportCsv()} className="rounded-xl border border-rw-line px-3 py-1.5 text-sm text-rw-ink hover:bg-rw-surfaceAlt">
              <Download className="mr-1 inline h-4 w-4" />
              CSV
            </a>
            <a href={exportPdf()} className="rounded-xl border border-rw-line px-3 py-1.5 text-sm text-rw-ink hover:bg-rw-surfaceAlt">
              <Download className="mr-1 inline h-4 w-4" />
              PDF
            </a>
        </div>
      </PageHeader>

      {streamStatus && (
        <p className="text-xs text-rw-muted">
          <Activity className="mr-1 inline h-3 w-3" />
          {streamStatus}
        </p>
      )}

      {/* Filtri */}
      <Card title={t("aiCommandCenter.filters")}>
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-1.5 text-sm"
            value={filters.periodDays ?? 30}
            onChange={(e) => setFilters({ ...filters, periodDays: Number(e.target.value) })}
          >
            <option value={7}>7 giorni</option>
            <option value={30}>30 giorni</option>
            <option value={90}>90 giorni</option>
          </select>
          <input
            className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-1.5 text-sm"
            placeholder={t("aiCommandCenter.filterModule")}
            value={filters.module ?? ""}
            onChange={(e) => setFilters({ ...filters, module: e.target.value || undefined })}
          />
          <input
            className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-1.5 text-sm"
            placeholder={t("aiCommandCenter.filterAutomation")}
            value={filters.automationModule ?? ""}
            onChange={(e) => setFilters({ ...filters, automationModule: e.target.value || undefined })}
          />
        </div>
      </Card>

      {/* Sezione 1 — Stato AI */}
      <Card title={t("aiCommandCenter.sectionStatus")} headerRight={<StatusDot ok={d.status.online} />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            d.status.online ? "🟢 AI Online" : "🔴 AI Offline",
            `Provider: ${d.status.provider}`,
            `Modello: ${d.status.model}`,
            `Heartbeat: ${new Date(d.status.lastHeartbeat).toLocaleTimeString()}`,
            `Streaming: ${d.status.streamingActive ? "Attivo" : "Off"}`,
            `RAG: ${d.status.ragActive ? "Attivo" : "Off"}`,
            `Vector DB: ${d.status.vectorDbActive ? "Attivo" : "Off"}`,
            `Memory: ${d.status.memoryActive ? "Attiva" : "Off"}`,
            `Automation: ${d.status.automationActive ? "Attivo" : "Off"}`,
            `Scheduler: ${d.status.schedulerActive ? "Attivo" : "Off"}`,
          ].map((text) => (
            <span key={text} className="rounded-full border border-rw-line bg-rw-surfaceAlt px-3 py-1.5 text-xs font-medium text-rw-soft">
              {text}
            </span>
          ))}
        </div>
      </Card>

      {/* Sezione 2 — KPI */}
      <Card title={t("aiCommandCenter.sectionKpi")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <KpiTile label="Workflow in esecuzione" value={d.kpis.workflowsRunning} />
          <KpiTile label="Decisioni oggi" value={d.kpis.decisionsToday} />
          <KpiTile label="Decisioni totali" value={d.kpis.decisionsTotal} />
          <KpiTile label="Automazioni OK" value={d.kpis.automationsCompleted} />
          <KpiTile label="Automazioni fail" value={d.kpis.automationsFailed} />
          <KpiTile label="In attesa" value={d.kpis.workflowsPending} />
          <KpiTile label="Approvazioni" value={d.kpis.supervisorApprovals} />
          <KpiTile label="Tempo medio risposta" value={d.kpis.avgResponseMs} suffix="ms" />
          <KpiTile label="Tempo medio OpenAI" value={d.kpis.avgOpenAiMs} suffix="ms" />
          <KpiTile label="Costo oggi" value={d.kpis.costTodayEur.toFixed(3)} suffix="EUR" />
          <KpiTile label="Costo mese" value={d.kpis.costMonthEur.toFixed(2)} suffix="EUR" />
          <KpiTile label="Token input" value={d.kpis.tokensInput} />
          <KpiTile label="Token output" value={d.kpis.tokensOutput} />
          <KpiTile label="Token totali" value={d.kpis.tokensTotal} />
          <KpiTile label="Chiamate OpenAI" value={d.kpis.openAiCalls} />
          <KpiTile label="Tool calling" value={d.kpis.toolCalls} />
          <KpiTile label="Ricerche RAG" value={d.kpis.ragSearches} />
          <KpiTile label="Documenti RAG" value={d.kpis.documentsConsulted} />
        </div>
      </Card>

      {/* Sezione 3 — Risparmio */}
      <Card title={t("aiCommandCenter.sectionSavings")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <KpiTile label="Ore risparmiate" value={d.savings.hoursSaved} />
          <KpiTile label="Minuti risparmiati" value={d.savings.timeSavedMinutes} />
          <KpiTile label="Ordini automatici" value={d.savings.automaticOrders} />
          <KpiTile label="Proposte approvate" value={d.savings.proposalsApproved} />
          <KpiTile label="Food cost ottim." value={d.savings.foodCostOptimized} />
          <KpiTile label="Sprechi evitati" value={d.savings.wasteAvoidedKg} suffix="kg" />
          <KpiTile label="Riordini auto" value={d.savings.automaticReorders} />
          <KpiTile label="Ricavi stimati" value={d.savings.estimatedRevenueEur} suffix="EUR" />
          <KpiTile label="Risparmio stimato" value={d.savings.estimatedSavingsEur} suffix="EUR" />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sezione 4 — Timeline */}
        <Card title={t("aiCommandCenter.sectionTimeline")}>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {d.timeline.map((ev) => (
              <li key={ev.id} className="flex gap-2 text-sm">
                {ev.level === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                {ev.level === "warning" && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />}
                {ev.level === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
                {ev.level === "info" && <Bot className="h-4 w-4 shrink-0 text-rw-accent" />}
                <div>
                  <p className="text-rw-ink">{ev.message}</p>
                  <p className="text-xs text-rw-muted">{new Date(ev.at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Sezione 5 — Workflow live */}
        <Card title={t("aiCommandCenter.sectionWorkflows")}>
          {d.workflowsLive.length === 0 ? (
            <p className="text-sm text-rw-muted">{t("aiCommandCenter.noWorkflows")}</p>
          ) : (
            <ul className="space-y-3">
              {d.workflowsLive.map((w) => (
                <li key={w.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-rw-ink">{w.module}</span>
                    <span className="rounded-full border border-rw-line px-2 py-0.5 text-xs">{w.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-rw-muted">{w.currentStep}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rw-line">
                    <div className="h-full bg-rw-accent transition-all" style={{ width: `${w.progressPct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-rw-muted">
                    {Math.round(w.elapsedMs / 1000)}s · {w.userId}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Sezione 6 — Automazioni */}
      <Card title={t("aiCommandCenter.sectionAutomations")}>
        <DataTable
          columns={[
            { key: "module", header: "Modulo", render: (r) => r.module },
            { key: "enabled", header: "Stato", render: (r) => (r.enabled ? "Attiva" : "Off") },
            { key: "level", header: "Livello", render: (r) => `L${r.level}` },
            { key: "triggers", header: "Trigger", render: (r) => r.triggers.slice(0, 2).join(", ") },
            { key: "lastRunAt", header: "Ultima", render: (r) => (r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : "—") },
            { key: "lastOutcome", header: "Esito", render: (r) => r.lastOutcome ?? "—" },
          ]}
          data={d.automations}
          keyExtractor={(r) => r.module}
          emptyMessage="Nessuna automazione configurata"
        />
      </Card>

      {/* Sezione 7 — Decisioni */}
      <Card title={t("aiCommandCenter.sectionDecisions")}>
        <DataTable
          columns={[
            { key: "module", header: "Modulo", render: (r) => r.module },
            { key: "decision", header: "Decisione", render: (r) => r.decision },
            { key: "confidence", header: "Conf.", render: (r) => (r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—") },
            { key: "sources", header: "Origine", render: (r) => [r.ruleBased && "Rules", r.openAi && "OpenAI", r.rag && "RAG"].filter(Boolean).join("+") },
            { key: "status", header: "Stato", render: (r) => r.status },
          ]}
          data={d.decisions}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessuna decisione nel periodo"
        />
      </Card>

      {/* Sezione 8 — Health */}
      <Card title={t("aiCommandCenter.sectionHealth")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {d.health.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
              <div>
                <p className="text-sm font-medium text-rw-ink">{h.label}</p>
                <p className="text-xs text-rw-muted">{h.detail}</p>
              </div>
              <HealthBadge status={h.status} />
            </div>
          ))}
        </div>
      </Card>

      {/* Sezione 9 — Statistiche */}
      <Card title={t("aiCommandCenter.sectionStats")}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold text-rw-muted">Decisioni AI (30g)</p>
            <MiniBarChart data={d.stats.decisions ?? []} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-rw-muted">Token (stima)</p>
            <MiniBarChart data={d.stats.tokens ?? []} color="bg-violet-400" />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-rw-muted">Costi EUR</p>
            <MiniBarChart data={d.stats.costs ?? []} color="bg-amber-400" />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-rw-muted">Workflow</p>
            <MiniBarChart data={d.stats.workflows ?? []} color="bg-cyan-400" />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-rw-muted">Automazioni</p>
            <MiniBarChart data={d.stats.automations ?? []} color="bg-emerald-400" />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-rw-muted">Errori</p>
            <MiniBarChart data={d.stats.errors ?? []} color="bg-red-400" />
          </div>
        </div>
      </Card>

      {/* Sezione 10 — Log */}
      <Card
        title={t("aiCommandCenter.sectionLogs")}
        headerRight={
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rw-muted" />
            <input
              className="rounded-lg border border-rw-line bg-rw-surfaceAlt py-1 pl-7 pr-2 text-xs"
              placeholder={t("aiCommandCenter.logSearch")}
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "at", header: "Quando", render: (r) => new Date(r.at).toLocaleString() },
            { key: "level", header: "Livello", render: (r) => r.level },
            { key: "module", header: "Modulo", render: (r) => r.module },
            { key: "message", header: "Messaggio", render: (r) => r.message },
          ]}
          data={filteredLogs}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessun log"
        />
      </Card>

      <p className="text-center text-xs text-rw-muted">
        <Brain className="mr-1 inline h-3 w-3" />
        {t("aiCommandCenter.footer")} · {new Date(d.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
