"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Copy,
  ExternalLink,
  Loader2,
  Printer,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";

type TokenizedRoom = {
  id: string;
  code: string;
  roomType: string;
  floor: number;
  token?: string;
};

const LS_KEY = (tid: string) => `rs-qr-room-base:${tid}`;

function normalizeBase(raw: string): string {
  const t = raw.trim().replace(/\/+$/, "");
  if (!t) return "";
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    return `${u.origin}${u.pathname.replace(/\/+$/, "") === "/" ? "" : u.pathname.replace(/\/+$/, "")}`;
  } catch { return ""; }
}

const inputCls = "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const btnGhost = "inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-medium text-rw-muted transition hover:bg-rw-surfaceAlt hover:text-rw-ink";

export function HotelQrRoomsPage() {
  const [rooms, setRooms] = useState<TokenizedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [appOrigin, setAppOrigin] = useState("");
  const [baseInput, setBaseInput] = useState("");
  const [filterFloor, setFilterFloor] = useState<number | "all">("all");

  useEffect(() => {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    setAppOrigin(fromEnv || (typeof window !== "undefined" ? window.location.origin : ""));
  }, []);

  useEffect(() => {
    if (!tenantId || typeof window === "undefined") return;
    const saved = localStorage.getItem(LS_KEY(tenantId));
    if (saved) setBaseInput(saved);
  }, [tenantId]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null);
      if (meRes?.tenantId) setTenantId(meRes.tenantId);

      const roomsRes = await fetch("/api/hotel/rooms", { cache: "no-store" });
      if (!roomsRes.ok) throw new Error("Errore caricamento camere");
      const roomList: Array<{ id: string; code: string; roomType: string; floor: number }> = await roomsRes.json();

      if (roomList.length === 0) { setRooms([]); return; }

      const tokenRes = await fetch("/api/hotel/rooms/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCodes: roomList.map((r) => r.code) }),
      }).catch(() => null);

      const tokenMap = new Map<string, string>();
      if (tokenRes?.ok) {
        const json = await tokenRes.json();
        const arr = Array.isArray(json?.tokens) ? json.tokens : [];
        for (const entry of arr) {
          if (entry?.code && entry?.token) tokenMap.set(String(entry.code), String(entry.token));
        }
      }

      setRooms(roomList.map((r) => ({ ...r, token: tokenMap.get(r.code) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const effectiveBase = useMemo(() => {
    const custom = normalizeBase(baseInput);
    return custom || appOrigin.replace(/\/+$/, "");
  }, [baseInput, appOrigin]);

  const roomUrl = (token?: string) =>
    token && effectiveBase ? `${effectiveBase}/r/${encodeURIComponent(token)}` : "";

  function saveBase() {
    if (!tenantId || typeof window === "undefined") return;
    if (normalizeBase(baseInput)) localStorage.setItem(LS_KEY(tenantId), baseInput.trim());
    else localStorage.removeItem(LS_KEY(tenantId));
  }

  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  }

  const floors = useMemo(() => [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b), [rooms]);

  const filtered = useMemo(() =>
    filterFloor === "all" ? rooms : rooms.filter((r) => r.floor === filterFloor),
    [rooms, filterFloor],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="QR Camere Hotel" subtitle="Genera e stampa i QR code per ogni camera — gli ospiti possono ordinare room service scansionando il codice.">
        <button type="button" onClick={() => void load()} className={btnGhost}>
          <RefreshCw className="h-4 w-4" /> Aggiorna
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90"
        >
          <Printer className="h-4 w-4" /> Stampa tutti
        </button>
      </PageHeader>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>
      )}

      <Card
        title="URL base dell'app"
        description="Il dominio usato per costruire i link QR delle camere. Salvato in locale per questo dispositivo."
      >
        <div className="space-y-3">
          <input
            type="url"
            value={baseInput}
            onChange={(e) => setBaseInput(e.target.value)}
            onBlur={saveBase}
            placeholder="https://tuohotel.it (lascia vuoto per usare questo dominio)"
            className={inputCls}
          />
          {effectiveBase && (
            <p className="rounded-lg border border-rw-line bg-rw-surfaceAlt/80 px-3 py-2 text-xs text-rw-soft">
              Esempio link camera: <span className="font-mono text-rw-ink">{effectiveBase}/r/…</span>
            </p>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 items-center">
        <Chip label="Camere" value={rooms.length} tone="default" />
        <Chip label="Piani" value={floors.length} tone="info" />
        {floors.length > 1 && (
          <div className="flex gap-1.5 ml-auto flex-wrap">
            <button
              type="button"
              onClick={() => setFilterFloor("all")}
              className={cn("rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                filterFloor === "all" ? "bg-rw-accent/15 text-rw-accent" : "border border-rw-line text-rw-muted hover:text-rw-ink")}
            >
              Tutti i piani
            </button>
            {floors.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterFloor(f)}
                className={cn("rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                  filterFloor === f ? "bg-rw-accent/15 text-rw-accent" : "border border-rw-line text-rw-muted hover:text-rw-ink")}
              >
                Piano {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-rw-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-3" /> Caricamento camere…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rw-line bg-rw-surface p-12 text-center">
          <BedDouble className="h-10 w-10 text-rw-muted" />
          <p className="font-display text-lg font-semibold text-rw-ink">Nessuna camera configurata</p>
          <p className="text-sm text-rw-soft">Aggiungi le camere dalla sezione Hotel prima di generare i QR.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 print:grid-cols-4 print:gap-6">
          {filtered.map((room) => {
            const url = roomUrl(room.token);
            const qrImg = url
              ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(url)}`
              : "";
            return (
              <div
                key={room.id}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-rw-line bg-rw-surface p-5 text-center transition hover:border-rw-accent/30 hover:shadow-lg print:border print:shadow-none print:break-inside-avoid"
              >
                {/* QR image */}
                <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-rw-line bg-white p-2">
                  {qrImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrImg} alt={`QR Camera ${room.code}`} className="h-full w-full object-contain" />
                  ) : (
                    <QrCode className="h-14 w-14 text-rw-muted" />
                  )}
                </div>

                {/* Room info */}
                <div>
                  <p className="font-display text-xl font-bold text-rw-ink">Camera {room.code}</p>
                  <p className="text-xs text-rw-muted">Piano {room.floor} · {room.roomType}</p>
                </div>

                {/* Print label */}
                <p className="text-[10px] text-rw-muted print:block hidden">
                  Scansiona per ordinare
                </p>

                {/* Actions (hidden on print) */}
                <div className="flex w-full flex-col gap-2 print:hidden">
                  <button
                    type="button"
                    disabled={!url}
                    onClick={() => void copyText(url)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-ink disabled:cursor-not-allowed disabled:opacity-60 hover:bg-rw-surface transition"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copia link
                  </button>
                  <a
                    href={url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-ink hover:bg-rw-surface transition",
                      !url && "pointer-events-none opacity-60",
                    )}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Anteprima ospite
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print instructions */}
      <div className="print:hidden rounded-2xl border border-rw-line bg-rw-surfaceAlt p-5 text-sm text-rw-muted space-y-2">
        <p className="font-semibold text-rw-ink">Come funziona per l&apos;ospite</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Stampa o mostra il QR code nella camera (plastica da tavolo, cartellino, ecc.)</li>
          <li>L&apos;ospite scansiona il QR con il suo smartphone</li>
          <li>Vede il catalogo dei servizi disponibili e ordina direttamente</li>
          <li>Il personale riceve la richiesta in tempo reale nella pagina Room Service</li>
          <li>Il costo viene addebitato al folio della camera al momento del check-out</li>
        </ol>
      </div>
    </div>
  );
}
