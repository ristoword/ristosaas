"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  Info,
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
import { archivioApi, archivioFiscalStubsApi, type ArchivedOrder, type ArchivioFiscalStub } from "@/lib/api-client";

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

function FiscalStubPanel({ kind, title }: { kind: "entrata" | "cassa"; title: string }) {
  const [rows, setRows] = useState<ArchivioFiscalStub[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [vatRateNote, setVatRateNote] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    archivioFiscalStubsApi
      .list(kind)
      .then(setRows)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Errore caricamento"))
      .finally(() => setLoading(false));
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      setSaveError("Importo non valido.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await archivioFiscalStubsApi.create({
        kind,
        reference,
        counterparty,
        issueDate,
        amount: amt,
        vatRateNote,
        notes,
      });
      setReference("");
      setCounterparty("");
      setIssueDate(new Date().toISOString().slice(0, 10));
      setAmount("");
      setVatRateNote("");
      setNotes("");
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title={title} headerRight={<FileText className="h-4 w-4 text-rw-accent" />}>
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold text-amber-100">Registro interno (non RT / SDI)</p>
            <p className="mt-1 text-amber-200/90">
              Schede salvate nel database del tenant per tracciabilità amministrativa. Non sostituiscono fatturazione
              elettronica né registratori telematici.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Nuova scheda" description="Aggiungi una riga al registro">
        <form onSubmit={(ev) => void handleAdd(ev)} className="grid gap-3 sm:grid-cols-2">
          {saveError && (
            <div className="sm:col-span-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {saveError}
            </div>
          )}
          <div>
            <label className={labelCls}>Riferimento documento</label>
            <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="es. FT 2026/12" />
          </div>
          <div>
            <label className={labelCls}>{kind === "entrata" ? "Fornitore" : "Cliente / intestatario"}</label>
            <input className={inputCls} value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="Ragione sociale" />
          </div>
          <div>
            <label className={labelCls}>Data</label>
            <input type="date" className={inputCls} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Importo (€)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Aliquota / nota IVA</label>
            <input className={inputCls} value={vatRateNote} onChange={(e) => setVatRateNote(e.target.value)} placeholder="es. 22% — detraibile" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Note</label>
            <textarea className={cn(inputCls, "resize-y")} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Salva nel registro
            </button>
          </div>
        </form>
      </Card>

      <Card title="Elenco" description={loadError ? loadError : `${rows.length} righe`}>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-rw-accent" />
          </div>
        ) : (
          <DataTable<ArchivioFiscalStub>
            columns={[
              { key: "issueDate", header: "Data", render: (r) => r.issueDate },
              { key: "reference", header: "Rif." },
              { key: "counterparty", header: kind === "entrata" ? "Fornitore" : "Cliente" },
              { key: "amount", header: "Importo", className: "text-right", render: (r) => `€${r.amount.toFixed(2)}` },
              { key: "vatRateNote", header: "IVA", render: (r) => (r.vatRateNote || "—") },
              { key: "notes", header: "Note", render: (r) => (r.notes ? (r.notes.length > 48 ? `${r.notes.slice(0, 48)}…` : r.notes) : "—") },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
            emptyMessage="Nessuna scheda ancora registrata"
          />
        )}
      </Card>
    </div>
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
        {activeTab === "fatture-entrata" && <FiscalStubPanel kind="entrata" title="Fatture in entrata" />}
        {activeTab === "fatture-cassa" && <FiscalStubPanel kind="cassa" title="Fatture da cassa" />}
        {activeTab === "comande" && <ComandePanel orders={orders} loading={loading} />}
      </div>
    </div>
  );
}
