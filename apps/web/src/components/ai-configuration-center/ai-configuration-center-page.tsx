"use client";

import {
  Activity,
  Bot,
  Brain,
  Database,
  Loader2,
  Mic,
  RefreshCw,
  Search,
  Server,
  Settings2,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { useAiConfigCenter } from "@/hooks/use-ai-config-center";
import type { HealthStatus } from "@/lib/ai/config-center/service";

function HealthBadge({ status }: { status: HealthStatus | string }) {
  const color =
    status === "green"
      ? "text-emerald-400 bg-emerald-500/10"
      : status === "yellow"
        ? "text-amber-400 bg-amber-500/10"
        : "text-red-400 bg-red-500/10";
  return <span className={cn("rounded-lg px-2 py-0.5 text-xs font-semibold uppercase", color)}>{status}</span>;
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
      <p className="truncate text-xs text-rw-muted">{label}</p>
      <p className="font-display text-base font-semibold text-rw-ink sm:text-lg">{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  saving,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  saving?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-start justify-between gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-rw-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-rw-muted">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin text-rw-muted" />}
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-rw-line accent-rw-accent"
          checked={checked}
          disabled={disabled || saving}
          onChange={(e) => onChange(e.target.checked)}
        />
      </span>
    </label>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-rw-accent" />
        <h2 className="font-display text-lg font-semibold text-rw-ink">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const TOGGLES: { key: string; label: string; hint?: string }[] = [
  { key: "aiMasterEnabled", label: "AI Master", hint: "Interruttore globale infrastruttura AI" },
  { key: "memoryEnabled", label: "Memory" },
  { key: "ragEnabled", label: "RAG" },
  { key: "vectorDbEnabled", label: "Vector Database" },
  { key: "toolCallingEnabled", label: "Tool Calling" },
  { key: "voiceAiEnabled", label: "Voice AI" },
  { key: "automationsEnabled", label: "Automazioni AI" },
  { key: "schedulerEnabled", label: "Scheduler" },
  { key: "streamingEnabled", label: "Streaming" },
  { key: "webSearchEnabled", label: "Web Search", hint: "Richiede TAVILY_API_KEY o SERPER_API_KEY" },
  { key: "multiAgentEnabled", label: "Multi Agent", hint: "Richiede AI_MULTI_AGENT_AVAILABLE=true" },
];

export function AiConfigurationCenterPage() {
  const { data, loading, error, saving, ragBusy, refresh, setToggle, ragAction } = useAiConfigCenter();

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-rw-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Caricamento AI Configuration Center…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
        {error ?? "Dati non disponibili"}
      </div>
    );
  }

  const t = data.toggles;

  return (
    <div className="mx-auto w-full max-w-[90rem] space-y-6 px-3 py-4 sm:px-4 md:px-6">
      <PageHeader
        title="AI Configuration Center"
        subtitle="Controllo enterprise dell'infrastruttura AI — solo Super Admin"
      >
        <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink hover:bg-rw-surface"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Aggiorna
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Section title="Toggle globali" icon={Settings2}>
          <div className="grid gap-2">
            {TOGGLES.map((row) => (
              <ToggleRow
                key={row.key}
                label={row.label}
                hint={row.hint}
                checked={Boolean((t as unknown as Record<string, boolean>)[row.key])}
                saving={saving === row.key}
                onChange={(v) => setToggle(row.key, v)}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-rw-muted">
            Ultimo aggiornamento: {new Date(t.updatedAt).toLocaleString("it-IT")}
            {t.updatedBy ? ` · da ${t.updatedBy}` : ""}
          </p>
        </Section>

        <Section title="RAG Center" icon={Search}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <HealthBadge status={data.rag.status} />
            {data.rag.lastError && <span className="text-xs text-red-300">{data.rag.lastError}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi label="Documenti" value={data.rag.documentsIndexed} />
            <Kpi label="Chunk" value={data.rag.chunksCreated} />
            <Kpi label="Embedding" value={data.rag.embeddingsGenerated} />
            <Kpi label="Dim. indice" value={formatBytes(data.rag.indexSizeBytes)} />
            <Kpi label="Ricerca media" value={data.rag.avgSearchMs != null ? `${data.rag.avgSearchMs} ms` : "—"} />
            <Kpi label="In errore" value={data.rag.errorDocuments} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["sync", "reindex_all", "update", "clear"] as const).map((action) => (
              <button
                key={action}
                type="button"
                disabled={ragBusy || !t.ragEnabled}
                onClick={() => ragAction(action === "reindex_all" ? "reindex_all" : action)}
                className="rounded-lg border border-rw-line bg-rw-surface px-2.5 py-1.5 text-xs text-rw-ink hover:bg-rw-surfaceAlt disabled:opacity-50"
              >
                {action === "sync" && "Avvia indicizzazione"}
                {action === "reindex_all" && "Reindicizza tutto"}
                {action === "update" && "Aggiorna indice"}
                {action === "clear" && "Svuota indice"}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Vector Database" icon={Database}>
          <div className="mb-2 flex flex-wrap gap-2">
            <HealthBadge status={data.vector.healthCheck} />
            <span className="text-xs text-rw-muted">{data.vector.activeProvider}</span>
          </div>
          <p className="mb-3 text-xs text-rw-muted">{data.vector.detail}</p>
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Connessione" value={data.vector.connectionStatus} />
            <Kpi label="Latenza" value={data.vector.latencyMs != null ? `${data.vector.latencyMs} ms` : "—"} />
            <Kpi label="Embedding" value={data.vector.embeddingCount} />
            <Kpi label="Spazio" value={formatBytes(data.vector.diskUsageBytes)} />
          </div>
          <p className="mt-2 text-xs text-rw-muted">
            Provider supportati: {data.vector.supportedProviders.join(", ")}
          </p>
        </Section>

        <Section title="Tool Calling" icon={Wrench}>
          <div className="mb-2">
            <HealthBadge status={data.tools.status} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Registrati" value={data.tools.registeredCount} />
            <Kpi label="Usati oggi" value={data.tools.usedToday} />
            <Kpi label="Errori oggi" value={data.tools.errorsToday} />
            <Kpi label="Ultima chiamata" value={data.tools.lastCallAt ? new Date(data.tools.lastCallAt).toLocaleTimeString("it-IT") : "—"} />
          </div>
          <p className="mt-2 text-xs text-rw-muted">
            Tool: {data.tools.availableTools.slice(0, 6).join(", ")}
            {data.tools.availableTools.length > 6 ? "…" : ""}
          </p>
        </Section>

        <Section title="Memory" icon={Brain}>
          <HealthBadge status={data.memory.status} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Kpi label="Conversazioni" value={data.memory.indexedConversations} />
            <Kpi label="Vettori" value={data.memory.memoryVectors} />
            <Kpi label="Profili" value={data.memory.profiles} />
            <Kpi label="Storage" value={formatBytes(data.memory.storageBytes)} />
            <Kpi label="Retention" value={`${data.memory.retentionDays} gg`} />
            <Kpi label="Ultimo save" value={data.memory.lastSaveAt ? new Date(data.memory.lastSaveAt).toLocaleDateString("it-IT") : "—"} />
          </div>
        </Section>

        <Section title="Streaming" icon={Zap}>
          <HealthBadge status={data.streaming.status} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Kpi label="Connessioni" value={data.streaming.activeConnections} />
            <Kpi label="Throughput oggi" value={data.streaming.throughputToday} />
            <Kpi label="Errori oggi" value={data.streaming.errorsToday} />
            <Kpi label="Heartbeat" value={new Date(data.streaming.lastHeartbeat).toLocaleTimeString("it-IT")} />
          </div>
        </Section>

        <Section title="Voice AI" icon={Mic}>
          <HealthBadge status={data.voice.status} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Kpi label="Provider" value={data.voice.provider} />
            <Kpi label="STT" value={data.voice.stt} />
            <Kpi label="TTS" value={data.voice.tts} />
            <Kpi label="Sessioni attive" value={data.voice.activeSessions} />
            <Kpi label="Lingue" value={data.voice.enabledLocales.join(", ")} />
          </div>
        </Section>

        <Section title="Automazioni" icon={Bot}>
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Scheduler" value={data.automation.schedulerActive ? "ON" : "OFF"} />
            <Kpi label="Job attivi" value={data.automation.activeJobs} />
            <Kpi label="Completati oggi" value={data.automation.completedJobs} />
            <Kpi label="Falliti oggi" value={data.automation.failedJobs} />
          </div>
        </Section>

        {data.webSearch && (
          <Section title="Web Search" icon={Search}>
            <HealthBadge status={data.webSearch.status} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Kpi label="Provider" value={data.webSearch.provider ?? "N/D"} />
              <Kpi label="Disponibile" value={data.webSearch.available ? "Sì" : "No"} />
              <Kpi label="Ricerche oggi" value={data.webSearch.searchesToday} />
              <Kpi label="Errori" value={data.webSearch.errorsToday} />
            </div>
          </Section>
        )}

        {data.multiAgent && (
          <Section title="Multi Agent" icon={Sparkles}>
            <HealthBadge status={data.multiAgent.orchestrationStatus} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Kpi label="Agenti" value={data.multiAgent.agentCount} />
              <Kpi label="Attivi" value={data.multiAgent.activeAgents} />
              <Kpi label="Routing" value={data.multiAgent.routing} />
              <Kpi label="Disponibile" value={data.multiAgent.available ? "Sì" : "No"} />
            </div>
          </Section>
        )}
      </div>

      <Section title="Health Center" icon={Activity}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.health.map((h) => (
            <div key={h.id} className="flex min-w-0 items-start justify-between gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-rw-ink">{h.label}</p>
                <p className="truncate text-xs text-rw-muted">{h.detail}</p>
              </div>
              <HealthBadge status={h.status} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="AI System Logs" icon={Server}>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Ultimo riavvio" value={new Date(data.meta.serverStartedAt).toLocaleString("it-IT")} />
          <Kpi label="Ultimo deploy" value={data.meta.lastDeployAt ? new Date(data.meta.lastDeployAt).toLocaleString("it-IT") : "—"} />
          <Kpi label="OpenAI" value={data.meta.openAiConfigured ? "OK" : "KO"} />
          <Kpi label="Eventi" value={data.logs.length} />
        </div>
        <div className="max-h-72 overflow-y-auto rounded-xl border border-rw-line">
          <table className="w-full min-w-[20rem] text-left text-xs">
            <thead className="sticky top-0 bg-rw-surfaceAlt text-rw-muted">
              <tr>
                <th className="px-3 py-2">Livello</th>
                <th className="px-3 py-2">Modulo</th>
                <th className="px-3 py-2">Messaggio</th>
                <th className="px-3 py-2">Quando</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-rw-muted">
                    Nessun evento registrato
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => (
                  <tr key={log.id} className="border-t border-rw-line/60">
                    <td className="px-3 py-2">
                      <HealthBadge status={log.level === "error" ? "red" : log.level === "warning" ? "yellow" : "green"} />
                    </td>
                    <td className="px-3 py-2 text-rw-muted">{log.module}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2 sm:max-w-none">{log.message}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-rw-muted">
                      {new Date(log.at).toLocaleString("it-IT")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
