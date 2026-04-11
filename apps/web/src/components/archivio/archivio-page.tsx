"use client";

import { useState } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  Plus,
  Receipt,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";

/* ── Shared styles ─────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

/* ── Tabs ──────────────────────────────────────────── */
const tabs = [
  { id: "report", label: "Report incassi" },
  { id: "fatture-entrata", label: "Fatture in entrata" },
  { id: "fatture-cassa", label: "Fatture da cassa" },
  { id: "comande", label: "Archivio comande" },
];

/* ── Mock: Report incassi ──────────────────────────── */
type ReportRow = { id: string; period: string; covers: number; revenue: number; average: number };
const mockReport: ReportRow[] = [
  { id: "r1", period: "2026-04-07", covers: 68, revenue: 2450.0, average: 36.03 },
  { id: "r2", period: "2026-04-08", covers: 52, revenue: 1870.5, average: 35.97 },
  { id: "r3", period: "2026-04-09", covers: 74, revenue: 2780.0, average: 37.57 },
  { id: "r4", period: "2026-04-10", covers: 91, revenue: 3620.0, average: 39.78 },
  { id: "r5", period: "2026-04-11", covers: 45, revenue: 1650.0, average: 36.67 },
];

/* ── Mock: Fatture in entrata ──────────────────────── */
type FatturaEntrata = { id: string; date: string; supplier: string; number: string; amount: number; iva: string; status: string };
const mockFattureEntrata: FatturaEntrata[] = [
  { id: "fe1", date: "2026-04-10", supplier: "Ortofrutticola Vesuvio", number: "FE-2026/034", amount: 480.0, iva: "10%", status: "Registrata" },
  { id: "fe2", date: "2026-04-09", supplier: "Caseificio Campano", number: "FE-2026/033", amount: 320.5, iva: "4%", status: "Da verificare" },
  { id: "fe3", date: "2026-04-08", supplier: "Bevande Italia Srl", number: "FE-2026/032", amount: 1150.0, iva: "22%", status: "Registrata" },
  { id: "fe4", date: "2026-04-05", supplier: "Macelleria De Luca", number: "FE-2026/031", amount: 890.0, iva: "10%", status: "Pagata" },
];

/* ── Mock: Fatture da cassa ────────────────────────── */
type FatturaCassa = { id: string; date: string; number: string; customer: string; amount: number; iva: string; type: string };
const mockFattureCassa: FatturaCassa[] = [
  { id: "fc1", date: "2026-04-11", number: "FC-2026/112", customer: "Azienda Moda Srl", amount: 245.0, iva: "10%", type: "Fattura" },
  { id: "fc2", date: "2026-04-10", number: "FC-2026/111", customer: "Studio Legale Rossi", amount: 180.0, iva: "10%", type: "Ricevuta" },
  { id: "fc3", date: "2026-04-09", number: "FC-2026/110", customer: "Privato", amount: 95.5, iva: "10%", type: "Scontrino" },
];

/* ── Mock: Archivio comande ────────────────────────── */
type Comanda = { id: string; datetime: string; table: string; area: string; status: string; covers: number; waiter: string };
const mockComande: Comanda[] = [
  { id: "c1", datetime: "2026-04-11 20:15", table: "T4", area: "Sala", status: "Chiusa", covers: 4, waiter: "Marco" },
  { id: "c2", datetime: "2026-04-11 19:30", table: "T7", area: "Terrazza", status: "Chiusa", covers: 2, waiter: "Sara" },
  { id: "c3", datetime: "2026-04-11 20:00", table: "T1", area: "Sala", status: "Annullata", covers: 6, waiter: "Marco" },
  { id: "c4", datetime: "2026-04-10 21:00", table: "T12", area: "Privé", status: "Chiusa", covers: 8, waiter: "Luca" },
  { id: "c5", datetime: "2026-04-10 20:30", table: "T3", area: "Sala", status: "Chiusa", covers: 3, waiter: "Sara" },
  { id: "c6", datetime: "2026-04-10 19:45", table: "T9", area: "Terrazza", status: "Chiusa", covers: 2, waiter: "Luca" },
];

/* ── Tab panels ────────────────────────────────────── */

function ReportPanel() {
  const [groupBy, setGroupBy] = useState("day");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls}>Da</label>
          <input type="date" className={inputCls} defaultValue="2026-04-07" />
        </div>
        <div>
          <label className={labelCls}>A</label>
          <input type="date" className={inputCls} defaultValue="2026-04-11" />
        </div>
        <div>
          <label className={labelCls}>Raggruppa per</label>
          <select className={inputCls} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="day">Giorno</option>
            <option value="month">Mese</option>
            <option value="year">Anno</option>
          </select>
        </div>
        <button type="button" className={btnPrimary}>
          <Search className="h-4 w-4" />
          Calcola
        </button>
      </div>

      <DataTable<ReportRow>
        columns={[
          { key: "period", header: "Periodo" },
          { key: "covers", header: "Coperti", className: "text-right" },
          { key: "revenue", header: "Incasso", className: "text-right", render: (r) => `€${r.revenue.toFixed(2)}` },
          { key: "average", header: "Media/coperto", className: "text-right", render: (r) => `€${r.average.toFixed(2)}` },
        ]}
        data={mockReport}
        keyExtractor={(r) => r.id}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Totale coperti", value: mockReport.reduce((s, r) => s + r.covers, 0) },
          { label: "Totale incasso", value: `€${mockReport.reduce((s, r) => s + r.revenue, 0).toFixed(2)}` },
          { label: "Media/coperto", value: `€${(mockReport.reduce((s, r) => s + r.revenue, 0) / mockReport.reduce((s, r) => s + r.covers, 0)).toFixed(2)}` },
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

function FattureEntrataPanel() {
  return (
    <div className="space-y-4">
      <Card title="Registra fattura fornitore" headerRight={<Plus className="h-4 w-4 text-rw-accent" />}>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className={labelCls}>Data</label>
            <input type="date" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fornitore</label>
            <input type="text" placeholder="Nome fornitore" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Numero fattura</label>
            <input type="text" placeholder="FE-2026/..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Importo (€)</label>
            <input type="number" step="0.01" placeholder="0.00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Aliquota IVA</label>
            <select className={inputCls}>
              <option>4%</option>
              <option>10%</option>
              <option>22%</option>
            </select>
          </div>
          <div className="flex items-end sm:col-span-1 lg:col-span-3">
            <button type="submit" className={btnPrimary}>
              <Plus className="h-4 w-4" />
              Registra
            </button>
          </div>
        </form>
      </Card>

      <DataTable<FatturaEntrata>
        columns={[
          { key: "date", header: "Data" },
          { key: "supplier", header: "Fornitore" },
          { key: "number", header: "N° Fattura" },
          { key: "amount", header: "Importo", className: "text-right", render: (r) => `€${r.amount.toFixed(2)}` },
          { key: "iva", header: "IVA" },
          {
            key: "status",
            header: "Stato",
            render: (r) => (
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                r.status === "Pagata" && "bg-emerald-500/15 text-emerald-400",
                r.status === "Registrata" && "bg-blue-500/15 text-blue-400",
                r.status === "Da verificare" && "bg-amber-500/15 text-amber-400",
              )}>
                {r.status}
              </span>
            ),
          },
        ]}
        data={mockFattureEntrata}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}

function FattureCassaPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-rw-muted">Fatture e ricevute emesse dalla cassa</p>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-4 py-2 text-sm font-semibold text-rw-soft hover:text-rw-ink">
          <Download className="h-4 w-4" />
          Esporta
        </button>
      </div>

      <DataTable<FatturaCassa>
        columns={[
          { key: "date", header: "Data" },
          { key: "number", header: "Numero" },
          { key: "customer", header: "Cliente" },
          { key: "amount", header: "Importo", className: "text-right", render: (r) => `€${r.amount.toFixed(2)}` },
          { key: "iva", header: "IVA" },
          {
            key: "type",
            header: "Tipo",
            render: (r) => (
              <span className="inline-flex items-center gap-1 text-rw-soft">
                {r.type === "Fattura" ? <FileText className="h-3.5 w-3.5" /> : <Receipt className="h-3.5 w-3.5" />}
                {r.type}
              </span>
            ),
          },
        ]}
        data={mockFattureCassa}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}

function ComandePanel() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls}>Da</label>
          <input type="date" className={inputCls} defaultValue="2026-04-10" />
        </div>
        <div>
          <label className={labelCls}>A</label>
          <input type="date" className={inputCls} defaultValue="2026-04-11" />
        </div>
        <button type="button" className={btnPrimary}>
          <CalendarDays className="h-4 w-4" />
          Filtra
        </button>
      </div>

      <DataTable<Comanda>
        columns={[
          { key: "datetime", header: "Data/Ora" },
          { key: "table", header: "Tavolo" },
          { key: "area", header: "Area" },
          {
            key: "status",
            header: "Stato",
            render: (r) => (
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                r.status === "Chiusa" && "bg-emerald-500/15 text-emerald-400",
                r.status === "Annullata" && "bg-red-500/15 text-red-400",
              )}>
                {r.status}
              </span>
            ),
          },
          { key: "covers", header: "Coperti", className: "text-right" },
          { key: "waiter", header: "Cameriere" },
        ]}
        data={mockComande}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}

/* ── Main ──────────────────────────────────────────── */
export function ArchivioPage() {
  const [activeTab, setActiveTab] = useState("report");

  return (
    <div className="space-y-6">
      <PageHeader title="Archivio" subtitle="Report finanziari, fatture e storico comande" />

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === "report" && <ReportPanel />}
        {activeTab === "fatture-entrata" && <FattureEntrataPanel />}
        {activeTab === "fatture-cassa" && <FattureCassaPanel />}
        {activeTab === "comande" && <ComandePanel />}
      </div>
    </div>
  );
}
