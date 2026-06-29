"use client";

import { Database, Loader2, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { useKnowledgeBase } from "@/hooks/use-knowledge-base";
import { cn } from "@/lib/utils";

const MODULES = [
  "general",
  "menu",
  "recipes",
  "food_cost",
  "haccp",
  "sop",
  "hotel",
  "reception",
  "housekeeping",
  "faq",
  "contracts",
];

export function AiKnowledgeBasePage() {
  const kb = useKnowledgeBase();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [docModule, setDocModule] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [semanticQ, setSemanticQ] = useState("");

  async function onFileUpload(file: File) {
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? "");
          const comma = result.indexOf(",");
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await kb.upload({
        title: title.trim() || file.name,
        module: docModule,
        fileName: file.name,
        mimeType: file.type || undefined,
        contentBase64: base64,
      });
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[90rem] space-y-6 px-3 py-4 sm:px-4 md:px-6">
      <PageHeader title="AI Knowledge Base" subtitle="Documenti tenant per RAG enterprise — upload, sync, versioni">
        <button
          type="button"
          onClick={() => kb.refresh()}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm"
        >
          <RefreshCw className={cn("h-4 w-4", kb.loading && "animate-spin")} />
          Aggiorna
        </button>
      </PageHeader>

      {kb.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{kb.error}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 space-y-3 p-4">
          <h2 className="font-display text-lg font-semibold text-rw-ink">Carica documento</h2>
          <input
            className="w-full rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm"
            placeholder="Titolo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="w-full rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm"
            value={docModule}
            onChange={(e) => setDocModule(e.target.value)}
          >
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx,.xls"
            className="w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFileUpload(f);
            }}
          />
          <p className="text-xs text-rw-muted">PDF, DOCX, XLSX, TXT, Markdown</p>
          {uploading && (
            <p className="flex items-center gap-2 text-sm text-rw-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Indicizzazione in corso…
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg border border-rw-line px-3 py-1.5 text-xs"
              onClick={() => kb.reindex("sync_entities")}
            >
              Sincronizza entità
            </button>
            <button
              type="button"
              className="rounded-lg border border-rw-line px-3 py-1.5 text-xs"
              onClick={() => kb.reindex("reindex_all")}
            >
              Reindicizza tutto
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-2 space-y-3 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-rw-muted" />
              <input
                className="w-full rounded-lg border border-rw-line bg-rw-surfaceAlt py-2 pl-9 pr-3 text-sm"
                placeholder="Ricerca semantica AI…"
                value={semanticQ}
                onChange={(e) => setSemanticQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && semanticQ.trim()) void kb.semanticSearch(semanticQ.trim());
                }}
              />
            </div>
            <button
              type="button"
              className="rounded-lg bg-rw-accent px-4 py-2 text-sm font-medium text-white"
              onClick={() => semanticQ.trim() && kb.semanticSearch(semanticQ.trim())}
            >
              Cerca
            </button>
          </div>

          {kb.searchResults.length > 0 && (
            <div className="space-y-2 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
              <p className="text-xs font-semibold uppercase text-rw-muted">Risultati semantici</p>
              {kb.searchResults.map((hit, i) => (
                <pre key={i} className="whitespace-pre-wrap text-xs text-rw-ink">
                  {JSON.stringify(hit, null, 2)}
                </pre>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-rw-muted" />
            <span className="text-sm text-rw-muted">{kb.documents.length} documenti</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-rw-line text-xs text-rw-muted">
                  <th className="py-2 pr-2">Titolo</th>
                  <th className="py-2 pr-2">Modulo</th>
                  <th className="py-2 pr-2">Stato</th>
                  <th className="py-2 pr-2">Chunk</th>
                  <th className="py-2 pr-2">Aggiornato</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {kb.documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-rw-line/60">
                    <td className="py-2 pr-2 font-medium">{doc.title}</td>
                    <td className="py-2 pr-2">{doc.module}</td>
                    <td className="py-2 pr-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs",
                          doc.status === "indexed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : doc.status === "error"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-amber-500/10 text-amber-400",
                        )}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-2 pr-2">{doc.chunkCount}</td>
                    <td className="py-2 pr-2 text-xs text-rw-muted">
                      {new Date(doc.updatedAt).toLocaleString("it-IT")}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title="Reindicizza"
                          className="rounded p-1 hover:bg-rw-surfaceAlt"
                          onClick={() => kb.reindex("reindex_document", doc.id)}
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Elimina"
                          className="rounded p-1 hover:bg-red-500/10 text-red-400"
                          onClick={() => kb.remove(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
