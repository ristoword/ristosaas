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
import { KpiTile } from "@/components/shared/kpi-tile";
import { StatusPill } from "@/components/shared/status-pill";
import { ALERT_INFO, BTN_GHOST, INPUT_CLASS, KPI_GRID, PANEL_GRID_2, SELECT_CLASS } from "@/components/shared/ui-classes";
import { tf } from "@/core/i18n/interpolate";
import { useI18n } from "@/core/i18n/provider";
import { translateApiError } from "@/core/i18n/translate-api-error";
import { hotelGuestRegisterApi, type GuestRegisterDashboard, type GuestRegisterEntry } from "@/lib/api-client";
import { todayIso } from "@/lib/date-utils";

const TX_KEYS: Record<string, string> = {
  pending: "hotel.guestRegister.tx.pending",
  sent: "hotel.guestRegister.tx.sent",
  error: "hotel.guestRegister.tx.error",
  cancelled: "hotel.guestRegister.tx.cancelled",
};

const STATUS_KEYS: Record<string, string> = {
  draft: "hotel.guestRegister.status.draft",
  incomplete: "hotel.guestRegister.status.incomplete",
  complete: "hotel.guestRegister.status.complete",
  checked_out: "hotel.guestRegister.status.checked_out",
};

export function HotelGuestRegisterPage() {
  const { t } = useI18n();
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
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.guestRegister.loadErr"), t));
    } finally {
      setLoading(false);
    }
  }, [query, txFilter, t]);

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
      setMsg(tf(t, "hotel.guestRegister.syncOk", { n: r.synced }));
      await load();
    } catch (e) {
      setMsg(translateApiError(e instanceof Error ? e.message : t("hotel.guestRegister.syncErr"), t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("hotel.guestRegister.page.title")} subtitle={t("hotel.guestRegister.page.subtitle")}>
        <button type="button" disabled={busy} onClick={() => void handleSync()} className={BTN_GHOST}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("hotel.guestRegister.sync")}
        </button>
        <button type="button" onClick={() => void load()} className={BTN_GHOST}>
          <RefreshCw className="h-4 w-4" /> {t("ui.update")}
        </button>
      </PageHeader>

      {msg && <div className={ALERT_INFO}>{msg}</div>}

      {dashboard && (
        <div className={KPI_GRID}>
          <KpiTile icon={Users} label={t("hotel.guestRegister.kpi.arrivals")} value={dashboard.arrivalsToday} />
          <KpiTile icon={ArrowRight} label={t("hotel.guestRegister.kpi.departures")} value={dashboard.departuresToday} />
          <KpiTile icon={UserCheck} label={t("hotel.guestRegister.kpi.present")} value={dashboard.guestsPresent} />
          <KpiTile icon={AlertTriangle} label={t("hotel.guestRegister.kpi.toRegister")} value={dashboard.toRegister} tone="warn" />
          <KpiTile icon={AlertTriangle} label={t("hotel.guestRegister.kpi.incomplete")} value={dashboard.incomplete} tone="warn" />
          <KpiTile icon={Send} label={t("hotel.guestRegister.kpi.sent")} value={dashboard.sent} tone="success" />
          <KpiTile icon={AlertTriangle} label={t("hotel.guestRegister.kpi.txErrors")} value={dashboard.transmissionErrors} tone="danger" />
          <KpiTile icon={Globe} label={t("hotel.guestRegister.kpi.nationalities")} value={dashboard.nationalityBreakdown.length} />
        </div>
      )}

      <div className={PANEL_GRID_2}>
        <Card className="min-w-0" title={t("hotel.guestRegister.nationality.title")}>
          {nationalityChart.length === 0 ? (
            <p className="text-sm text-rw-muted">{t("hotel.guestRegister.nationality.empty")}</p>
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

        <Card className="min-w-0" title={t("hotel.guestRegister.status.title")}>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,8rem),1fr))]">
            {dashboard?.statusBreakdown.map((s) => (
              <div key={s.status} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                <p className="text-xs text-rw-muted">{t(STATUS_KEYS[s.status] ?? s.status)}</p>
                <p className="font-display text-xl font-semibold text-rw-ink">{s.count}</p>
              </div>
            ))}
            {dashboard?.transmissionBreakdown.map((s) => (
              <div key={s.status} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                <p className="text-xs text-rw-muted">{t(TX_KEYS[s.status] ?? s.status)}</p>
                <p className="font-display text-xl font-semibold text-rw-ink">{s.count}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title={t("hotel.guestRegister.search.title")}>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input className={`${INPUT_CLASS} pl-8`} placeholder={t("hotel.guestRegister.search.placeholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className={SELECT_CLASS} value={txFilter} onChange={(e) => setTxFilter(e.target.value)}>
            <option value="all">{t("hotel.guestRegister.search.allTx")}</option>
            <option value="pending">{t("hotel.guestRegister.tx.pending")}</option>
            <option value="sent">{t("hotel.guestRegister.tx.sent")}</option>
            <option value="error">{t("hotel.guestRegister.tx.error")}</option>
            <option value="cancelled">{t("hotel.guestRegister.tx.cancelled")}</option>
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
                      {t("hotel.guestRegister.list.room")} {e.roomCode || "—"} · {e.arrivalDate} → {e.departureDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <StatusPill tone={e.status === "complete" ? "success" : e.status === "incomplete" ? "warn" : "default"}>
                      {t(STATUS_KEYS[e.status] ?? e.status)}
                    </StatusPill>
                    <StatusPill tone={e.transmissionStatus === "error" ? "danger" : e.transmissionStatus === "sent" ? "success" : "default"}>
                      {t(TX_KEYS[e.transmissionStatus] ?? e.transmissionStatus)}
                    </StatusPill>
                  </div>
                </Link>
              </li>
            ))}
            {entries.length === 0 && <p className="py-6 text-center text-sm text-rw-muted">{t("hotel.guestRegister.list.empty")}</p>}
          </ul>
        )}
      </Card>
    </div>
  );
}
