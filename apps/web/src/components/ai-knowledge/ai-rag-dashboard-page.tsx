"use client";

import { Activity, Database, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { useKnowledgeBase } from "@/hooks/use-knowledge-base";
import { cn } from "@/lib/utils";

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
      <p className="text-xs text-rw-muted">{label}</p>
      <p className="font-display text-lg font-semibold text-rw-ink">{value}</p>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function AiRagDashboardPage() {
  const { stats, loading, error, refresh, reindex } = useKnowledgeBase();
  const k = stats?.knowledge as Record<string, unknown> | undefined;
  const v = stats?.vector as Record<string, unknown> | undefined;
  const t = stats?.toggles;

  return (
    <div className="mx-auto w-full max-w-[90rem] space-y-6 px-3 py-4 sm:px-4 md:px-6">
      <PageHeader title="Dashboard RAG" subtitle="Vector DB, embedding, statistiche ricerca — enterprise">
        <button
          type="button"
          onClick={() => refresh()}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Aggiorna
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>
      )}

      {loading && !stats ? (
        <div className="flex items-center gap-2 text-rw-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Caricamento…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-2 text-rw-muted">
                <Sparkles className="h-4 w-4" /> Stato RAG
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>RAG</span>
                <span className={t?.ragEnabled ? "text-emerald-400" : "text-red-400"}>
                  {t?.ragEnabled ? "ON" : "OFF"}
                </span>
                <span>Vector DB</span>
                <span className={t?.vectorDbEnabled ? "text-emerald-400" : "text-red-400"}>
                  {t?.vectorDbEnabled ? "ON" : "OFF"}
                </span>
                <span>Embedding</span>
                <span className={t?.embeddingEnabled ? "text-emerald-400" : "text-red-400"}>
                  {t?.embeddingEnabled ? "ON" : "OFF"}
                </span>
                <span>Indicizzazione</span>
                <span className={t?.indexingEnabled ? "text-emerald-400" : "text-red-400"}>
                  {t?.indexingEnabled ? "ON" : "OFF"}
                </span>
              </div>
            </Card>

            <Card className="p-4 lg:col-span-3">
              <div className="mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                <h2 className="font-display font-semibold">Knowledge Base</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kpi label="Documenti" value={Number(k?.documents ?? 0)} />
                <Kpi label="Indicizzati" value={Number(k?.documentsIndexed ?? 0)} />
                <Kpi label="Chunk" value={Number(k?.chunks ?? 0)} />
                <Kpi label="Embedding" value={Number(k?.embeddingCount ?? 0)} />
                <Kpi label="Spazio indice" value={formatBytes(Number(k?.indexBytes ?? 0))} />
                <Kpi label="Query RAG" value={Number(k?.ragQueryCount ?? 0)} />
                <Kpi label="Cache hit" value={Number(k?.ragCacheHits ?? 0)} />
                <Kpi
                  label="Ricerca media"
                  value={k?.ragAvgSearchMs != null ? `${Math.round(Number(k.ragAvgSearchMs))} ms` : "—"}
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <h2 className="font-display font-semibold">Vector Database (pgvector)</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Kpi label="Chunk totali" value={Number(v?.chunkCount ?? 0)} />
                <Kpi label="Sorgenti" value={Number(v?.sourceCount ?? 0)} />
                <Kpi label="HNSW" value={v?.hnswIndexed ? "Attivo" : "—"} />
                <Kpi label="Versione" value={String(v?.pgvectorVersion ?? "—")} />
                <Kpi label="Spazio" value={formatBytes(Number(v?.totalBytes ?? 0))} />
                <Kpi
                  label="Ultimo aggiornamento"
                  value={
                    v?.lastUpdated ? new Date(String(v.lastUpdated)).toLocaleString("it-IT") : "—"
                  }
                />
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <h2 className="font-display font-semibold">Operazioni</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  ["sync_entities", "Sincronizza entità"],
                  ["reindex_all", "Reindicizza tutto"],
                  ["reindex_manual", "Manuale piattaforma"],
                ].map(([action, label]) => (
                  <button
                    key={action}
                    type="button"
                    className="rounded-lg border border-rw-line px-3 py-2 text-xs hover:bg-rw-surfaceAlt"
                    onClick={() => reindex(action)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="max-h-48 overflow-y-auto text-xs text-rw-muted">
                <p className="mb-1 font-semibold text-rw-ink">Cronologia audit</p>
                {(stats?.audit as Array<{ action: string; createdAt: string }> | undefined)?.map((a, i) => (
                  <div key={i} className="border-b border-rw-line/40 py-1">
                    {a.action} — {new Date(a.createdAt).toLocaleString("it-IT")}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
