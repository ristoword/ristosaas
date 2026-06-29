"use client";

import {
  Activity,
  Bot,
  Brain,
  Database,
  Mic,
  Search,
  Server,
  Settings2,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import type { AiConfigCenterPayload } from "@/lib/api-client";
import type { useAiConfigCenter } from "@/hooks/use-ai-config-center";
import {
  formatBytes,
  HealthBadge,
  Kpi,
  Section,
  ToggleRow,
} from "@/components/ai-configuration-center/ai-control-shared";

const TOGGLES: { key: string; label: string; hint?: string }[] = [
  { key: "aiMasterEnabled", label: "AI Master", hint: "Interruttore globale infrastruttura AI" },
  { key: "memoryEnabled", label: "Memory" },
  { key: "ragEnabled", label: "RAG" },
  { key: "vectorDbEnabled", label: "Vector Database" },
  { key: "embeddingEnabled", label: "Embedding" },
  { key: "indexingEnabled", label: "Indicizzazione automatica" },
  { key: "toolCallingEnabled", label: "Tool Calling" },
  { key: "voiceAiEnabled", label: "Voice AI" },
  { key: "automationsEnabled", label: "Automazioni AI" },
  { key: "schedulerEnabled", label: "Scheduler" },
  { key: "streamingEnabled", label: "Streaming" },
  { key: "webSearchEnabled", label: "Web Search", hint: "Richiede TAVILY_API_KEY o SERPER_API_KEY" },
  { key: "multiAgentEnabled", label: "Multi Agent", hint: "Richiede AI_MULTI_AGENT_AVAILABLE=true" },
];

type Props = {
  data: AiConfigCenterPayload;
  config: ReturnType<typeof useAiConfigCenter>;
  canMutate: boolean;
};

export function AiInfrastructurePanel({ data, config, canMutate }: Props) {
  const t = data.toggles;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Section title="Toggle globali" icon={Settings2}>
          <div className="grid gap-2">
            {TOGGLES.map((row) => (
              <ToggleRow
                key={row.key}
                label={row.label}
                hint={row.hint}
                checked={Boolean((t as unknown as Record<string, boolean>)[row.key])}
                saving={config.saving === row.key}
                disabled={!canMutate}
                onChange={(v) => config.setToggle(row.key, v)}
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
            <Kpi
              label="Ultima sync"
              value={data.rag.lastSyncAt ? new Date(data.rag.lastSyncAt).toLocaleString("it-IT") : "—"}
            />
          </div>
          {canMutate && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(["sync", "reindex_all", "update", "clear"] as const).map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={config.ragBusy || !t.ragEnabled}
                  onClick={() => config.ragAction(action === "reindex_all" ? "reindex_all" : action)}
                  className="rounded-lg border border-rw-line bg-rw-surface px-2.5 py-1.5 text-xs text-rw-ink hover:bg-rw-surfaceAlt disabled:opacity-50"
                >
                  {action === "sync" && "Avvia indicizzazione"}
                  {action === "reindex_all" && "Reindicizza tutto"}
                  {action === "update" && "Aggiorna indice"}
                  {action === "clear" && "Svuota indice"}
                </button>
              ))}
            </div>
          )}
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
        </Section>

        <Section title="Tool Calling" icon={Wrench}>
          <HealthBadge status={data.tools.status} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Kpi label="Registrati" value={data.tools.registeredCount} />
            <Kpi label="Usati oggi" value={data.tools.usedToday} />
            <Kpi label="Errori oggi" value={data.tools.errorsToday} />
          </div>
        </Section>

        <Section title="Memory" icon={Brain}>
          <HealthBadge status={data.memory.status} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Kpi label="Conversazioni" value={data.memory.indexedConversations} />
            <Kpi label="Vettori" value={data.memory.memoryVectors} />
            <Kpi label="Profili" value={data.memory.profiles} />
            <Kpi label="Storage" value={formatBytes(data.memory.storageBytes)} />
          </div>
        </Section>

        <Section title="Streaming" icon={Zap}>
          <HealthBadge status={data.streaming.status} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Kpi label="Connessioni" value={data.streaming.activeConnections} />
            <Kpi label="Throughput oggi" value={data.streaming.throughputToday} />
            <Kpi label="Errori oggi" value={data.streaming.errorsToday} />
          </div>
        </Section>

        <Section title="Voice AI" icon={Mic}>
          <HealthBadge status={data.voice.status} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Kpi label="Provider" value={data.voice.provider} />
            <Kpi label="Sessioni attive" value={data.voice.activeSessions} />
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

        {data.multiAgent && (
          <Section title="Multi Agent" icon={Sparkles}>
            <HealthBadge status={data.multiAgent.orchestrationStatus} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Kpi label="Agenti" value={data.multiAgent.agentCount} />
              <Kpi label="Attivi" value={data.multiAgent.activeAgents} />
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
    </>
  );
}
