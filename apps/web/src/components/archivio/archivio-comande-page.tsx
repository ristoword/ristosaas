"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Download,
  Calendar,
  Eye,
  X,
  FileText,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { archivioApi, type ArchivedOrder } from "@/lib/api-client";

type OrderStatus = "completato" | "annullato" | "stornato";

const statusTone: Record<OrderStatus, "success" | "danger" | "warn"> = {
  completato: "success",
  annullato: "danger",
  stornato: "warn",
};

export function ArchivioComandePage() {
  const [orders, setOrders] = useState<ArchivedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detail, setDetail] = useState<ArchivedOrder | null>(null);

  useEffect(() => {
    archivioApi
      .list()
      .then(setOrders)
      .catch((err) => console.error("Failed to fetch archivio:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.id.toLowerCase().includes(q) &&
          !o.waiter.toLowerCase().includes(q) &&
          !o.table.toLowerCase().includes(q)
        )
          return false;
      }
      if (statusFilter && o.status !== statusFilter) return false;
      if (dateFrom && o.date < dateFrom) return false;
      if (dateTo && o.date > dateTo) return false;
      return true;
    });
  }, [orders, search, statusFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <PageHeader title="Archivio comande" subtitle="Storico ordini con ricerca e filtri">
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink">
          <Download className="h-4 w-4" /> Esporta CSV
        </button>
      </PageHeader>

      {/* filters */}
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca ordine, cameriere, tavolo…" className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-4 text-sm text-rw-ink placeholder:text-rw-muted" />
          </label>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")} className="w-full appearance-none rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 pr-10 text-sm text-rw-ink">
              <option value="">Tutti gli stati</option>
              <option value="completato">Completato</option>
              <option value="annullato">Annullato</option>
              <option value="stornato">Stornato</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
          </div>
          <label className="flex items-center gap-2 text-sm text-rw-muted">
            <Calendar className="h-4 w-4 shrink-0" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" />
          </label>
          <label className="flex items-center gap-2 text-sm text-rw-muted">
            <Calendar className="h-4 w-4 shrink-0" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" />
          </label>
        </div>
      </Card>

      {/* orders list */}
      <Card title={`Ordini (${filtered.length})`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-rw-accent" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 && <p className="py-6 text-center text-sm text-rw-muted">Nessun ordine trovato.</p>}
            {filtered.map((o) => (
              <button key={o.id} type="button" onClick={() => setDetail(o)} className="flex w-full items-center gap-4 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-left transition hover:border-rw-accent/30">
                <FileText className="h-5 w-5 shrink-0 text-rw-accent" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-rw-ink">{o.id} — Tavolo {o.table}</p>
                  <p className="text-xs text-rw-muted">{o.date} {o.closedAt?.slice(11, 16) ?? ""} · {o.waiter}</p>
                </div>
                <Chip label={o.status} tone={statusTone[o.status]} />
                <span className="shrink-0 font-display text-sm font-bold text-rw-ink">€ {o.total.toFixed(2)}</span>
                <Eye className="h-4 w-4 shrink-0 text-rw-muted" />
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* detail overlay */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="w-full max-w-md rounded-3xl border border-rw-line bg-rw-surface p-6 shadow-rw">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Dettaglio ordine</p>
                <h2 className="font-display text-xl font-bold text-rw-ink">{detail.id}</h2>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink" aria-label="Chiudi">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-rw-muted">
              <span>Tavolo {detail.table}</span>·<span>{detail.date} {detail.closedAt?.slice(11, 16) ?? ""}</span>·<span>{detail.waiter}</span>·<span>{detail.paymentMethod}</span>
            </div>
            <Chip label={detail.status} tone={statusTone[detail.status]} className="mt-3" />
            <div className="mt-4 space-y-1">
              {detail.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-rw-soft">{it.qty}× {it.name}</span>
                  <span className="font-semibold text-rw-ink">€ {(it.qty * it.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-rw-line pt-3 text-right font-display text-xl font-bold text-rw-ink">€ {detail.total.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
