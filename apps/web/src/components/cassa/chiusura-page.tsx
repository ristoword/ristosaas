"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  Download,
  Loader2,
  Lock,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { useOrders } from "@/components/orders/orders-context";
import {
  reportsApi,
  type DailyClosureReport,
  type UnifiedReportSnapshot,
} from "@/lib/api-client";
import { addDaysIso, formatHumanDate, todayIso } from "@/lib/date-utils";

type WaiterStat = { id: string; name: string; covers: number; tickets: number; revenue: number };
type AreaStat = { id: string; name: string; total: number; pct: number };

function isSameDay(iso: string, dayIso: string): boolean {
  return iso.slice(0, 10) === dayIso;
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
      <div className="flex items-center gap-2 text-rw-muted">
        <Icon className={`h-4 w-4 ${tone ?? "text-rw-accent"}`} />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-rw-ink">{value}</p>
    </div>
  );
}

export function ChiusuraPage() {
  const { orders, refresh } = useOrders();
  const [selectedDay, setSelectedDay] = useState<string>(() => todayIso());
  const [unified, setUnified] = useState<UnifiedReportSnapshot | null>(null);
  const [history, setHistory] = useState<DailyClosureReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [alreadyClosed, setAlreadyClosed] = useState<DailyClosureReport | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadDay = useCallback(
    async (day: string) => {
      setLoading(true);
      setError(null);
      try {
        const [unifiedSnap, dailyList] = await Promise.all([
          reportsApi.unified({ from: day, to: day }),
          reportsApi.daily.list({ from: addDaysIso(day, -30), to: day }),
        ]);
        setUnified(unifiedSnap);
        setHistory(dailyList.sort((a, b) => b.date.localeCompare(a.date)));
        const match = dailyList.find((item) => item.date === day) ?? null;
        setAlreadyClosed(match);
        setNotes(match?.notes ?? "");
      } catch (err) {
        setError((err as Error).message || "Errore caricamento report");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDay(selectedDay);
  }, [selectedDay, loadDay]);

  const dayOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          isSameDay(order.createdAt, selectedDay) &&
          !["annullato"].includes(order.status),
      ),
    [orders, selectedDay],
  );

  const totalsFromOrders = useMemo(() => {
    let lordo = 0;
    let covers = 0;
    const byWaiter = new Map<string, WaiterStat>();
    const byArea = new Map<string, number>();

    for (const order of dayOrders) {
      const orderTotal = order.items.reduce(
        (sum, item) => sum + (item.price ?? 0) * item.qty,
        0,
      );
      lordo += orderTotal;
      covers += order.covers ?? 0;

      const waiterKey = order.waiter || "—";
      const existing = byWaiter.get(waiterKey) ?? {
        id: waiterKey,
        name: waiterKey,
        covers: 0,
        tickets: 0,
        revenue: 0,
      };
      existing.covers += order.covers ?? 0;
      existing.tickets += 1;
      existing.revenue += orderTotal;
      byWaiter.set(waiterKey, existing);

      for (const item of order.items) {
        const areaTotal = (item.price ?? 0) * item.qty;
        byArea.set(item.area, (byArea.get(item.area) ?? 0) + areaTotal);
      }
    }

    const waiterStats: WaiterStat[] = Array.from(byWaiter.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    const areaStats: AreaStat[] = Array.from(byArea.entries())
      .map(([name, total]) => ({
        id: name,
        name,
        total,
        pct: lordo > 0 ? (total / lordo) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { lordo, covers, tickets: dayOrders.length, waiterStats, areaStats };
  }, [dayOrders]);

  const revenue = unified?.restaurantRevenue ?? totalsFromOrders.lordo;
  const hotelRevenue = unified?.hotelRevenue ?? 0;
  const roomChargeRevenue = unified?.integratedRoomChargeRevenue ?? 0;
  const foodCost = unified?.realCosts?.foodCost ?? 0;
  const staffCost = unified?.realCosts?.staffCost ?? 0;
  const margin = unified?.realCosts?.margin ?? revenue - foodCost - staffCost;

  async function handleClose() {
    if (alreadyClosed) return;
    setClosing(true);
    setError(null);
    try {
      await reportsApi.daily.upsert({
        date: selectedDay,
        revenue,
        foodSpend: foodCost,
        staffSpend: staffCost,
        notes,
      });
      await loadDay(selectedDay);
      await refresh();
    } catch (err) {
      setError((err as Error).message || "Errore chiusura giornata");
    } finally {
      setClosing(false);
    }
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chiusura di cassa (Z)"
        subtitle={`Riepilogo giornaliero — ${formatHumanDate(selectedDay)}`}
      >
        <input
          type="date"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value || todayIso())}
          className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink"
        />
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink"
        >
          <Printer className="h-4 w-4" /> Stampa
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink"
        >
          <Download className="h-4 w-4" /> Esporta PDF
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carico snapshot giornaliero…
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Incasso ristorante" value={`€ ${revenue.toFixed(2)}`} icon={TrendingUp} />
        <Stat label="Incasso hotel" value={`€ ${hotelRevenue.toFixed(2)}`} icon={TrendingUp} tone="text-blue-400" />
        <Stat label="Room charge integrato" value={`€ ${roomChargeRevenue.toFixed(2)}`} icon={CreditCard} />
        <Stat label="Margine stimato" value={`€ ${margin.toFixed(2)}`} icon={TrendingUp} tone="text-emerald-400" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Food cost reale" value={`€ ${foodCost.toFixed(2)}`} icon={Banknote} tone="text-amber-400" />
        <Stat label="Costo staff" value={`€ ${staffCost.toFixed(2)}`} icon={Users} />
        <Stat
          label="Scontrini / Coperti"
          value={`${totalsFromOrders.tickets} / ${totalsFromOrders.covers}`}
          icon={Users}
        />
      </div>

      <Card
        title="Dettaglio per cameriere"
        description="Aggregato dai ticket creati nella giornata selezionata."
      >
        <DataTable
          columns={[
            {
              key: "name",
              header: "Cameriere",
              render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span>,
            },
            { key: "covers", header: "Coperti" },
            { key: "tickets", header: "Scontrini" },
            {
              key: "revenue",
              header: "Incasso",
              render: (r) => (
                <span className="font-semibold text-rw-ink">€ {r.revenue.toFixed(2)}</span>
              ),
            },
          ]}
          data={totalsFromOrders.waiterStats}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessun ordine rilevato in questa giornata"
        />
      </Card>

      <Card title="Dettaglio per area">
        {totalsFromOrders.areaStats.length === 0 ? (
          <p className="py-6 text-center text-sm text-rw-muted">
            Nessun ordine con items valorizzati in questa giornata.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {totalsFromOrders.areaStats.map((area) => (
              <div
                key={area.id}
                className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-rw-muted">
                  {area.name}
                </p>
                <p className="mt-2 font-display text-xl font-bold text-rw-ink">
                  € {area.total.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-rw-muted">{area.pct.toFixed(1)}% del lordo</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Chiusura giornata"
        description="La chiusura salva il report persistente usato da dashboard, trend e forecast."
      >
        <div className="space-y-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note di chiusura (facoltative)…"
            rows={3}
            className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-rw-muted">
              {alreadyClosed
                ? `Giornata già chiusa il ${formatHumanDate(alreadyClosed.date)}`
                : "La chiusura aggiorna / crea il report giornaliero tenant."}
            </p>
            <button
              type="button"
              onClick={handleClose}
              disabled={closing || loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-rw-accent px-6 py-3.5 text-base font-semibold text-white shadow-rw transition hover:bg-rw-accent/90 disabled:opacity-50"
            >
              {closing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
              {alreadyClosed ? "Aggiorna chiusura" : "Chiudi giornata"}
            </button>
          </div>
        </div>
      </Card>

      <Card
        title="Storico chiusure"
        description="Ultimi 30 giorni — tutte persistenti."
      >
        <DataTable
          columns={[
            {
              key: "date",
              header: "Giornata",
              render: (r) => (
                <span className="font-semibold text-rw-ink">{formatHumanDate(r.date)}</span>
              ),
            },
            {
              key: "revenue",
              header: "Incasso",
              render: (r) => <span className="tabular-nums">€ {r.revenue.toFixed(2)}</span>,
            },
            {
              key: "foodSpend",
              header: "Food cost",
              render: (r) => <span className="tabular-nums">€ {r.foodSpend.toFixed(2)}</span>,
            },
            {
              key: "staffSpend",
              header: "Staff",
              render: (r) => <span className="tabular-nums">€ {r.staffSpend.toFixed(2)}</span>,
            },
            {
              key: "notes",
              header: "Note",
              render: (r) => <span className="text-rw-muted">{r.notes || "—"}</span>,
            },
          ]}
          data={history}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessun report giornaliero salvato ancora."
        />
      </Card>
    </div>
  );
}
