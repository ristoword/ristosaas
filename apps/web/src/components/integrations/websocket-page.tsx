"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Radio,
  ArrowDown,
  Users,
  Zap,
  Loader2,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";

/** Planned channel names when a WS gateway exists — no traffic until then. */
const CHANNEL_NAMES = ["sala", "kds", "cassa", "prenotazioni"] as const;

export function WebsocketPage() {
  const [httpOk, setHttpOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const ping = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetch("/api/health/live", { cache: "no-store" });
      setHttpOk(res.ok);
      setLastCheck(new Date());
      if (!res.ok) setCheckError(`HTTP ${res.status}`);
    } catch {
      setHttpOk(false);
      setLastCheck(new Date());
      setCheckError("Richiesta fallita");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void ping();
    const id = window.setInterval(() => void ping(), 30_000);
    return () => window.clearInterval(id);
  }, [ping]);

  const subscribedChannelsCount = CHANNEL_NAMES.length;

  return (
    <div className="space-y-6">
      <PageHeader title="WebSocket monitor" subtitle="Stato dell’app e traffico real-time">
        <button
          type="button"
          onClick={() => void ping()}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink disabled:opacity-60"
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Aggiorna
        </button>
      </PageHeader>

      <Card title="Informazioni deployment" description="Il progetto Next.js non espone attualmente un endpoint WebSocket: non esiste connessione WS dal browser verso questo servizio.">
        <div className="rounded-xl border border-rw-accent/25 bg-rw-accent/10 px-4 py-3 text-sm text-rw-soft">
          <Globe className="mb-2 inline h-4 w-4 text-rw-accent" />{" "}
          Le funzionalità operative usano HTTP (REST). Un gateway WebSocket potrebbe essere aggiunto in futuro come servizio separato.
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
          <div className="flex items-center gap-2 text-rw-muted">
            <Globe className="h-4 w-4 text-rw-accent" />
            <span className="text-xs font-semibold uppercase tracking-wide">HTTP /api/health/live</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {checking && httpOk === null ? (
              <Loader2 className="h-6 w-6 animate-spin text-rw-muted" />
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold",
                  httpOk ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                )}
              >
                {httpOk ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {httpOk ? "Raggiungibile" : "Non OK"}
              </span>
            )}
          </div>
          {checkError && <p className="mt-2 text-xs text-red-400">{checkError}</p>}
          {lastCheck && (
            <p className="mt-2 text-xs text-rw-muted">Ultimo controllo: {lastCheck.toLocaleTimeString("it-IT")}</p>
          )}
        </div>
        <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
          <div className="flex items-center gap-2 text-rw-muted">
            <Users className="h-4 w-4 text-rw-accent" />
            <span className="text-xs font-semibold uppercase tracking-wide">Client WebSocket</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-rw-ink">0</p>
          <p className="mt-1 text-xs text-rw-muted">Nessun session ID WS lato server.</p>
        </div>
        <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
          <div className="flex items-center gap-2 text-rw-muted">
            <Radio className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wide">Canali previsti</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-rw-ink">{subscribedChannelsCount}</p>
          <p className="mt-1 text-xs text-rw-muted">Solo roadmap — nessun broker attivo.</p>
        </div>
        <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
          <div className="flex items-center gap-2 text-rw-muted">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wide">Messaggi (stream)</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-rw-ink">0</p>
          <p className="mt-1 text-xs text-rw-muted">Nessuno stream WS.</p>
        </div>
      </div>

      <Card title="Canali (roadmap)" description="Nomi possibili per un futuro gateway — non sono sottoscrivibili oggi.">
        <div className="flex flex-wrap gap-2">
          {CHANNEL_NAMES.map((ch) => (
            <span
              key={ch}
              className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2 text-sm font-semibold text-rw-muted"
            >
              {ch}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Client connessi">
        <p className="py-6 text-center text-sm text-rw-muted">Nessun client WebSocket — servizio non avviato.</p>
      </Card>

      <Card title="Log messaggi" headerRight={<span className="flex items-center gap-1.5 text-xs text-rw-muted"><ArrowDown className="h-3.5 w-3.5" /> Stream vuoto</span>}>
        <div className="max-h-80 py-6 text-center font-mono text-xs text-rw-muted">
          Nessun messaggio WebSocket da mostrare. Operazioni real-time attuali passano da richieste HTTP verso <code className="rounded bg-rw-surfaceAlt px-1">/api/…</code>.
        </div>
      </Card>
    </div>
  );
}
