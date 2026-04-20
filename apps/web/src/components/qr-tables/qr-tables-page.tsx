"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, QrCode, Copy, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { MockPreviewBanner } from "@/components/shared/mock-preview-banner";
import { tablesApi, type SalaTable } from "@/lib/api-client";

type TokenizedTable = SalaTable & { token?: string };

export function QrTablesPage() {
  const [tables, setTables] = useState<TokenizedTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string>("");
  const [appOrigin, setAppOrigin] = useState<string>("");

  useEffect(() => {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    setAppOrigin(fromEnv || (typeof window !== "undefined" ? window.location.origin : ""));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, list] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        tablesApi.list(),
      ]);
      if (meRes?.tenantId) setTenantId(meRes.tenantId);

      const tokenByTableId = new Map<string, string>();
      // Request server-generated HMAC tokens in batch.
      if (list.length > 0) {
        const tokenRes = await fetch("/api/tables/tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableIds: list.map((t) => t.id) }),
        }).catch(() => null);
        if (tokenRes?.ok) {
          const json = await tokenRes.json();
          const arr = Array.isArray(json?.tokens) ? json.tokens : [];
          for (const entry of arr) {
            if (entry?.id && entry?.token) tokenByTableId.set(entry.id, String(entry.token));
          }
        }
      }

      const enriched: TokenizedTable[] = list.map((t) => ({ ...t, token: tokenByTableId.get(t.id) }));
      setTables(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di caricamento tavoli.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tables) {
      counts.set(t.roomId, (counts.get(t.roomId) ?? 0) + 1);
    }
    return counts;
  }, [tables]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  const printUrl = (token?: string) => (token && appOrigin ? `${appOrigin}/t/${encodeURIComponent(token)}` : "");

  return (
    <div className="space-y-6">
      <PageHeader title="QR Tavoli" subtitle="Genera e stampa i codici QR per ogni tavolo">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]"
        >
          <Printer className="h-4 w-4" />
          Stampa tutti
        </button>
      </PageHeader>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && tables.length === 0 ? (
        <MockPreviewBanner title="Nessun tavolo configurato">
          Configura prima i tavoli dalla sezione Sala. Questa pagina genererà automaticamente URL e
          QR code firmati quando ci saranno tavoli reali.
        </MockPreviewBanner>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Chip label="Tavoli" value={tables.length} tone="default" />
        <Chip label="Sale" value={areas.size} tone="info" />
        <Chip label="Dominio pubblico" value={appOrigin || "—"} tone="accent" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {tables.map((table) => {
          const url = printUrl(table.token);
          const qrImg = url
            ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`
            : "";
          return (
            <div
              key={table.id}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-rw-line bg-rw-surface p-5 text-center transition hover:border-rw-accent/30 hover:shadow-lg"
            >
              <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-rw-line bg-white p-2">
                {qrImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrImg} alt={`QR Tavolo ${table.nome}`} className="h-full w-full object-contain" />
                ) : (
                  <QrCode className="h-12 w-12 text-rw-muted" />
                )}
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-rw-ink">{table.nome}</p>
                <p className="text-xs text-rw-muted">Posti: {table.posti}</p>
              </div>
              <div className="flex w-full flex-col gap-2">
                <button
                  type="button"
                  disabled={!url}
                  onClick={() => void copyText(url)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="h-3.5 w-3.5" /> Copia URL
                </button>
                <a
                  href={url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!url}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-ink ${
                    url ? "" : "pointer-events-none opacity-60"
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Apri
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
