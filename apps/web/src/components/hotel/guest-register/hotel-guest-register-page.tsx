"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import {
  hotelGuestRegisterApi,
  type GuestRegisterDashboard,
  type GuestRegisterEntry,
} from "@/lib/api-client";
import { KpiTile } from "@/components/shared/kpi-tile";
import { StatusPill } from "@/components/shared/status-pill";
import { ALERT_INFO, BTN_GHOST, INPUT_CLASS, KPI_GRID, SELECT_CLASS } from "@/components/shared/ui-classes";
import { todayIso } from "@/lib/date-utils";

const TX_LABELS: Record<string, string> = {
  pending: "Da inviare",
  sent: "Inviato",
  error: "Errore",
  cancelled: "Annullato",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  incomplete: "Incompleta",
  complete: "Completa",
  checked_out: "Check-out",
};

export function HotelGuestRegisterPage() {
  const [dashboard, setDashboard] = useState<GuestRegisterDashboard | null>(null);
  const [entries, setEntries] = useState<GuestRegisterEntry[]>([]);
  const [query, setQuery] = useState("");
  const [txFilter, setTxFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, search] = await Promise.all([
        hotelGuestRegisterApi.dashboard(todayIso()),
        hotelGuestRegisterApi.search({
          query: query || undefined,
          transmissionStatus: txFilter === "all" ? undefined : txFilter,
          page: 1,
          pageSize: 50,
        }),
      ]);
      setDashboard(dash);
      setEntries(search.items);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [query, txFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const nationalityChart = useMemo(() => {
    if (!dashboard?.nationalityBreakdown.length) return [];
    const max = Math.max(...dashboard.nationalityBreakdown.map((n) => n.count), 1);
    return dashboard.nationalityBreakdown.slice(0, 8).map((n) => ({ ...n, pct: (n.count / max) * 100 }));
  }, [dashboard]);

  const handleSync = async () => {
    setBusy(true);
    try {
      const r = await hotelGuestRegisterApi.sync(todayIso());
      setMsg(`Sincronizzate ${r.synced} registrazioni.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync fallita");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Registro Alloggiati"
        subtitle="Scheda ospite enterprise — documenti, OCR, firme e trasmissione autorità."
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSync()}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-semibold text-rw-ink hover:bg-rw-surfaceAlt disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync prenotazioni
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-semibold text-rw-ink hover:bg-rw-surfaceAlt"
        >
          Aggiorna
        </button>
      </PageHeader>

      {msg && <div className={ALERT_INFO}>{msg}</div>}

      {dashboard && (
        <div className={KPI_GRID}>
          <KpiTile icon={Users} label="Arrivi oggi" value={dashboard.arrivalsToday} />
          <KpiTile icon={ArrowRight} label="Partenze oggi" value={dashboard.departuresToday} />
          <KpiTile icon={UserCheck} label="Ospiti presenti" value={dashboard.guestsPresent} />
          <KpiTile icon={AlertTriangle} label="Da registrare" value={dashboard.toRegister} tone="warn" />
          <KpiTile icon={AlertTriangle} label="Incomplete" value={dashboard.incomplete} tone="warn" />
          <KpiTile icon={Send} label="Inviate" value={dashboard.sent} tone="success" />
          <KpiTile icon={AlertTriangle} label="Errori trasmissione" value={dashboard.transmissionErrors} tone="danger" />
          <KpiTile icon={Globe} label="Nazionalità" value={dashboard.nationalityBreakdown.length} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Nazionalità — ospiti in casa">
          {nationalityChart.length === 0 ? (
            <p className="text-sm text-rw-muted">Nessun dato disponibile.</p>
          ) : (
            <ul className="space-y-2">
              {nationalityChart.map((n) => (
                <li key={n.nationality}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-rw-soft">{n.nationality}</span>
                    <span className="font-semibold text-rw-ink">{n.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-rw-surfaceAlt">
                    <div className="h-2 rounded-full bg-rw-accent" style={{ width: `${n.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Stato registrazioni">
          <div className="grid grid-cols-2 gap-2">
            {dashboard?.statusBreakdown.map((s) => (
              <div key={s.status} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                <p className="text-xs text-rw-muted">{STATUS_LABELS[s.status] ?? s.status}</p>
                <p className="font-display text-xl font-semibold text-rw-ink">{s.count}</p>
              </div>
            ))}
            {dashboard?.transmissionBreakdown.map((s) => (
              <div key={s.status} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                <p className="text-xs text-rw-muted">{TX_LABELS[s.status] ?? s.status}</p>
                <p className="font-display text-xl font-semibold text-rw-ink">{s.count}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Ricerca registrazioni">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input
              className={`${INPUT_CLASS} pl-8`}
              placeholder="Nome, camera, documento…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className={SELECT_CLASS} value={txFilter} onChange={(e) => setTxFilter(e.target.value)}>
            <option value="all">Tutti gli stati TX</option>
            <option value="pending">Da inviare</option>
            <option value="sent">Inviato</option>
            <option value="error">Errore</option>
            <option value="cancelled">Annullato</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-rw-muted" />
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/hotel/guest-register/${e.id}`}
                  className="flex items-center justify-between rounded-2xl border border-rw-line bg-rw-surfaceAlt p-3 transition hover:border-rw-accent/40"
                >
                  <div>
                    <p className="font-semibold text-rw-ink">{e.guestName || e.reservationId}</p>
                    <p className="text-xs text-rw-muted">
                      Cam. {e.roomCode || "—"} · {e.arrivalDate} → {e.departureDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <StatusPill tone={e.status === "complete" ? "success" : e.status === "incomplete" ? "warn" : "default"}>
                      {STATUS_LABELS[e.status] ?? e.status}
                    </StatusPill>
                    <StatusPill tone={e.transmissionStatus === "error" ? "danger" : e.transmissionStatus === "sent" ? "success" : "default"}>
                      {TX_LABELS[e.transmissionStatus] ?? e.transmissionStatus}
                    </StatusPill>
                  </div>
                </Link>
              </li>
            ))}
            {entries.length === 0 && <p className="py-6 text-center text-sm text-rw-muted">Nessuna registrazione trovata.</p>}
          </ul>
        )}
      </Card>
    </div>
  );
}
