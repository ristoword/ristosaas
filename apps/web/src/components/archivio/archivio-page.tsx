"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";
import { archivioApi, type ArchivedOrder } from "@/lib/api-client";
import { Info } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const tabs = [
  { id: "report", label: "Report incassi" },
  { id: "fatture-entrata", label: "Fatture in entrata" },
  { id: "fatture-cassa", label: "Fatture da cassa" },
  { id: "comande", label: "Archivio comande" },
];

type ReportRow = { id: string; period: string; orders: number; revenue: number; average: number };


/* ── Tab panels ────────────────────────────────────── */

function ReportPanel({ orders, loading }: { orders: ArchivedOrder[]; loading: boolean }) {
  const [groupBy, setGroupBy] = useState("day");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const report = useMemo(() => {
    const filtered = orders.filter((o) => {
      if (o.status === "annullato") return false;
      if (dateFrom && o.date < dateFrom) return false;
      if (dateTo && o.date > dateTo) return false;
      return true;
    });

    const grouped = new Map<string, { revenue: number; count: number }>();
    for (const o of filtered) {
      let key = o.date;
      if (groupBy === "month") key = o.date.slice(0, 7);
      else if (groupBy === "year") key = o.date.slice(0, 4);

      const existing = grouped.get(key) ?? { revenue: 0, count: 0 };
      existing.revenue += o.total;
      existing.count += 1;
      grouped.set(key, existing);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([period, data], i) => ({
        id: `r${i}`,
        period,
        orders: data.count,
        revenue: data.revenue,
        average: data.count > 0 ? data.revenue / data.count : 0,
      }));
  }, [orders, groupBy, dateFrom, dateTo]);

  const totalRevenue = report.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = report.reduce((s, r) => s + r.orders, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-rw-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls}>Da</label>
          <input type="date" className={inputCls} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>A</label>
          <input type="date" className={inputCls} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Raggruppa per</label>
          <select className={inputCls} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="day">Giorno</option>
            <option value="month">Mese</option>
            <option value="year">Anno</option>
          </select>
        </div>
      </div>

      <DataTable<ReportRow>
        columns={[
          { key: "period", header: "Periodo" },
          { key: "orders", header: "Ordini", className: "text-right" },
          { key: "revenue", header: "Incasso", className: "text-right", render: (r) => `€${r.revenue.toFixed(2)}` },
          { key: "average", header: "Media/ordine", className: "text-right", render: (r) => `€${r.average.toFixed(2)}` },
        ]}
        data={report}
        keyExtractor={(r) => r.id}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Totale ordini", value: totalOrders },
          { label: "Totale incasso", value: `€${totalRevenue.toFixed(2)}` },
          { label: "Media/ordine", value: `€${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00"}` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-rw-ink">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FiscalPlaceholderPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card title={title} headerRight={<FileText className="h-4 w-4 text-rw-accent" />}>
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold text-amber-100">Modulo fiscale non incluso in questo piano</p>
          <p className="mt-1 text-amber-200/90">{description}</p>
          <p className="mt-2 text-xs text-amber-200/70">
            Quando il modulo fiscale sarà attivo (RT cloud o provider simile), questa sezione gestirà
            automaticamente registrazione, IVA, stampa e conservazione.
          </p>
        </div>
      </div>
    </Card>
  );
}

function ComandePanel({ orders, loading }: { orders: ArchivedOrder[]; loading: boolean }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (dateFrom && o.date < dateFrom) return false;
      if (dateTo && o.date > dateTo) return false;
      return true;
    });
  }, [orders, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-rw-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls}>Da</label>
          <input type="date" className={inputCls} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>A</label>
          <input type="date" className={inputCls} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <DataTable<ArchivedOrder>
        columns={[
          { key: "date", header: "Data", render: (r) => `${r.date} ${r.closedAt?.slice(11, 16) ?? ""}` },
          { key: "table", header: "Tavolo" },
          { key: "waiter", header: "Cameriere" },
          {
            key: "status",
            header: "Stato",
            render: (r) => (
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                r.status === "completato" && "bg-emerald-500/15 text-emerald-400",
                r.status === "annullato" && "bg-red-500/15 text-red-400",
                r.status === "stornato" && "bg-amber-500/15 text-amber-400",
              )}>
                {r.status}
              </span>
            ),
          },
          { key: "paymentMethod", header: "Pagamento" },
          { key: "total", header: "Totale", className: "text-right", render: (r) => `€${r.total.toFixed(2)}` },
        ]}
        data={filtered}
        keyExtractor={(r) => r.id}
        emptyMessage="Nessuna comanda trovata"
      />
    </div>
  );
}

/* ── Main ──────────────────────────────────────────── */
export function ArchivioPage() {
  const [activeTab, setActiveTab] = useState("report");
  const [orders, setOrders] = useState<ArchivedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    archivioApi
      .list()
      .then(setOrders)
      .catch((err) => console.error("Failed to fetch archivio:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Archivio" subtitle="Report finanziari, fatture e storico comande" />

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === "report" && <ReportPanel orders={orders} loading={loading} />}
        {activeTab === "fatture-entrata" && (
          <FiscalPlaceholderPanel
            title="Fatture in entrata"
            description="Registrazione fatture fornitori non disponibile. L'archivio acquisti va fatto con il tuo gestionale fiscale attuale o con il modulo RT cloud quando attivato."
          />
        )}
        {activeTab === "fatture-cassa" && (
          <FiscalPlaceholderPanel
            title="Fatture da cassa"
            description="L'emissione di fatture o ricevute fiscali richiede il collegamento a un registratore telematico o a un provider RT cloud. Gli incassi restano comunque tracciati su Archivio comande."
          />
        )}
        {activeTab === "comande" && <ComandePanel orders={orders} loading={loading} />}
      </div>
    </div>
  );
}
