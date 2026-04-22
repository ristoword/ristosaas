"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Armchair, Copy, ExternalLink, Link2, Printer, QrCode } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { tablesApi, type SalaTable } from "@/lib/api-client";

type TokenizedTable = SalaTable & { token?: string };

const LS_KEY = (tid: string) => `rs-qr-menu-base:${tid}`;

/** Normalizza input utente in URL base (senza slash finale). */
function normalizeMenuBaseUrl(raw: string): string {
  const t = raw.trim().replace(/\/+$/, "");
  if (!t) return "";
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.origin}${path === "/" ? "" : path}`;
  } catch {
    return "";
  }
}

export function QrTablesPage() {
  const [tables, setTables] = useState<TokenizedTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string>("");
  const [appOrigin, setAppOrigin] = useState<string>("");
  /** Valore mostrato nel campo (può essere incompleto mentre si digita). */
  const [menuBaseInput, setMenuBaseInput] = useState("");

  useEffect(() => {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    setAppOrigin(fromEnv || (typeof window !== "undefined" ? window.location.origin : ""));
  }, []);

  useEffect(() => {
    if (!tenantId || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(LS_KEY(tenantId));
      if (saved != null) setMenuBaseInput(saved);
    } catch {
      /* ignore */
    }
  }, [tenantId]);

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
  }, []);

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

  const effectiveMenuBase = useMemo(() => {
    const custom = normalizeMenuBaseUrl(menuBaseInput);
    if (custom) return custom;
    return (appOrigin || "").replace(/\/+$/, "");
  }, [menuBaseInput, appOrigin]);

  const printUrl = (token?: string) =>
    token && effectiveMenuBase ? `${effectiveMenuBase}/t/${encodeURIComponent(token)}` : "";

  function saveMenuBaseToStorage() {
    if (!tenantId || typeof window === "undefined") return;
    try {
      if (normalizeMenuBaseUrl(menuBaseInput)) {
        localStorage.setItem(LS_KEY(tenantId), menuBaseInput.trim());
      } else {
        localStorage.removeItem(LS_KEY(tenantId));
      }
    } catch {
      /* ignore */
    }
  }

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
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rw-line bg-rw-surface px-6 py-10 text-center">
          <Armchair className="h-8 w-8 text-rw-muted" aria-hidden />
          <p className="font-display text-lg font-semibold text-rw-ink">
            Nessun tavolo configurato
          </p>
          <p className="max-w-md text-sm text-rw-soft">
            Configura prima i tavoli dalla sezione Sala. Appena saranno disponibili,
            questa pagina genererà URL e QR code firmati con HMAC per ognuno.
          </p>
          <Link
            href="/rooms"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rw-accent/90"
          >
            Vai a Sala e tavoli
          </Link>
        </div>
      ) : null}

      <Card
        title="URL del menu / sito"
        description="Inserisci il dominio o l'indirizzo pubblico dove è raggiungibile il menu: sarà la base per tutti i link ai tavoli (stesso percorso /t/… su ogni QR)."
        headerRight={<Link2 className="h-4 w-4 text-rw-accent" />}
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="qr-menu-base-url" className="sr-only">
              URL base menu
            </label>
            <input
              id="qr-menu-base-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              value={menuBaseInput}
              onChange={(e) => setMenuBaseInput(e.target.value)}
              onBlur={() => saveMenuBaseToStorage()}
              placeholder="Inserisci l'URL del tuo menu (es. https://tuoristorante.it)"
              className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30"
            />
            <p className="mt-2 text-xs text-rw-muted">
              Senza barra finale. Se lasci vuoto, si usa il dominio di questa app
              {appOrigin ? (
                <>
                  {" "}
                  (<span className="font-mono text-rw-soft">{appOrigin}</span>)
                </>
              ) : null}
              . Il valore viene salvato per questo locale sul tuo browser.
            </p>
          </div>
          {normalizeMenuBaseUrl(menuBaseInput) ? (
            <p className="rounded-lg border border-rw-line bg-rw-surfaceAlt/80 px-3 py-2 text-xs text-rw-soft">
              Esempio link tavolo:{" "}
              <span className="break-all font-mono text-rw-ink">
                {effectiveMenuBase}/t/…
              </span>
            </p>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Chip label="Tavoli" value={tables.length} tone="default" />
        <Chip label="Sale" value={areas.size} tone="info" />
        <Chip label="Base URL usata" value={effectiveMenuBase || "—"} tone="accent" />
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
