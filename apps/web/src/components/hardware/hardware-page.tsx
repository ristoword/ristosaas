"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Monitor,
  Network,
  Plus,
  Printer,
  Route,
  Trash2,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";
import { Chip } from "@/components/shared/chip";

/* ── Styles ────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

/* ── Tabs ──────────────────────────────────────────── */
const tabs = [
  { id: "dispositivi", label: "Dispositivi" },
  { id: "rotte", label: "Rotte stampa" },
  { id: "coda", label: "Coda stampa" },
];

/* ── Mock: Devices ─────────────────────────────────── */
type Device = {
  id: string;
  name: string;
  type: string;
  department: string;
  connection: string;
  ip: string;
  port: number;
  status: "online" | "offline";
  notes: string;
};

const mockDevices: Device[] = [
  { id: "dev1", name: "Stampante Cucina", type: "Stampante termica", department: "Cucina", connection: "TCP/IP", ip: "192.168.1.101", port: 9100, status: "online", notes: "Epson TM-T88VI" },
  { id: "dev2", name: "Stampante Pizzeria", type: "Stampante termica", department: "Pizzeria", connection: "TCP/IP", ip: "192.168.1.102", port: 9100, status: "online", notes: "Epson TM-T88VI" },
  { id: "dev3", name: "Stampante Bar", type: "Stampante termica", department: "Bar", connection: "USB", ip: "", port: 0, status: "offline", notes: "Star TSP143" },
  { id: "dev4", name: "Stampante Cassa", type: "Stampante fiscale", department: "Cassa", connection: "TCP/IP", ip: "192.168.1.100", port: 9100, status: "online", notes: "Custom KUBE II" },
  { id: "dev5", name: "Monitor KDS", type: "Display", department: "Cucina", connection: "HDMI", ip: "", port: 0, status: "online", notes: "Monitor 22\"" },
];

/* ── Mock: Routes ──────────────────────────────────── */
type PrintRoute = {
  id: string;
  event: string;
  department: string;
  device: string;
};

const mockRoutes: PrintRoute[] = [
  { id: "rt1", event: "Nuova comanda", department: "Cucina", device: "Stampante Cucina" },
  { id: "rt2", event: "Nuova comanda", department: "Pizzeria", device: "Stampante Pizzeria" },
  { id: "rt3", event: "Ordine bevande", department: "Bar", device: "Stampante Bar" },
  { id: "rt4", event: "Chiusura conto", department: "Cassa", device: "Stampante Cassa" },
  { id: "rt5", event: "Preconto", department: "Cassa", device: "Stampante Cassa" },
];

/* ── Mock: Print queue ─────────────────────────────── */
type PrintJob = {
  id: string;
  datetime: string;
  document: string;
  device: string;
  status: "completato" | "in-coda" | "errore";
};

const mockPrintJobs: PrintJob[] = [
  { id: "pj1", datetime: "2026-04-11 20:15", document: "Comanda T4 #1023", device: "Stampante Cucina", status: "completato" },
  { id: "pj2", datetime: "2026-04-11 20:15", document: "Comanda T4 #1023 (pizza)", device: "Stampante Pizzeria", status: "completato" },
  { id: "pj3", datetime: "2026-04-11 20:12", document: "Bevande T7", device: "Stampante Bar", status: "errore" },
  { id: "pj4", datetime: "2026-04-11 20:10", document: "Preconto T1", device: "Stampante Cassa", status: "completato" },
  { id: "pj5", datetime: "2026-04-11 20:18", document: "Comanda T9 #1024", device: "Stampante Cucina", status: "in-coda" },
];

/* ── Panels ────────────────────────────────────────── */

function DispositiviPanel() {
  return (
    <div className="space-y-4">
      <Card title="Aggiungi dispositivo" headerRight={<Plus className="h-4 w-4 text-rw-accent" />}>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className={labelCls}>Nome</label>
            <input type="text" placeholder="Es. Stampante Cucina" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tipo</label>
            <select className={inputCls}>
              <option>Stampante termica</option>
              <option>Stampante fiscale</option>
              <option>Display</option>
              <option>Altro</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Reparto</label>
            <select className={inputCls}>
              <option>Cucina</option>
              <option>Pizzeria</option>
              <option>Bar</option>
              <option>Cassa</option>
              <option>Sala</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Tipo connessione</label>
            <select className={inputCls}>
              <option>TCP/IP</option>
              <option>USB</option>
              <option>Bluetooth</option>
              <option>HDMI</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Indirizzo IP</label>
            <input type="text" placeholder="192.168.1.xxx" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Porta</label>
            <input type="number" placeholder="9100" className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>Note</label>
            <input type="text" placeholder="Modello, posizione..." className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className={btnPrimary}>
              <Plus className="h-4 w-4" />
              Aggiungi dispositivo
            </button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {mockDevices.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-4 rounded-xl border border-rw-line bg-rw-surface p-4 transition hover:border-rw-accent/25"
          >
            <div className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              d.status === "online" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
            )}>
              {d.type === "Display" ? <Monitor className="h-5 w-5" /> : <Printer className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-rw-ink">{d.name}</p>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  d.status === "online" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                )}>
                  {d.status === "online" ? "Online" : "Offline"}
                </span>
              </div>
              <p className="text-xs text-rw-soft">
                {d.type} · {d.department} · {d.connection}
                {d.ip && ` · ${d.ip}:${d.port}`}
              </p>
              {d.notes && <p className="text-xs text-rw-muted">{d.notes}</p>}
            </div>
            <button type="button" className="shrink-0 text-rw-muted hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RottePanel() {
  return (
    <div className="space-y-4">
      <Card title="Nuova rotta" headerRight={<Route className="h-4 w-4 text-rw-accent" />}>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className={labelCls}>Tipo evento</label>
            <select className={inputCls}>
              <option>Nuova comanda</option>
              <option>Ordine bevande</option>
              <option>Chiusura conto</option>
              <option>Preconto</option>
              <option>Nota cucina</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Reparto</label>
            <select className={inputCls}>
              <option>Cucina</option>
              <option>Pizzeria</option>
              <option>Bar</option>
              <option>Cassa</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Dispositivo</label>
            <select className={inputCls}>
              {mockDevices.map((d) => (
                <option key={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className={btnPrimary}>
              <Plus className="h-4 w-4" />
              Aggiungi rotta
            </button>
          </div>
        </form>
      </Card>

      <DataTable<PrintRoute>
        columns={[
          { key: "event", header: "Evento" },
          { key: "department", header: "Reparto" },
          {
            key: "device",
            header: "Dispositivo",
            render: (r) => (
              <span className="inline-flex items-center gap-1.5">
                <Printer className="h-3.5 w-3.5 text-rw-muted" />
                {r.device}
              </span>
            ),
          },
        ]}
        data={mockRoutes}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}

function CodaPanel() {
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = statusFilter
    ? mockPrintJobs.filter((j) => j.status === statusFilter)
    : mockPrintJobs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Chip label="Totale" value={mockPrintJobs.length} tone="default" />
        <Chip label="In coda" value={mockPrintJobs.filter((j) => j.status === "in-coda").length} tone="warn" />
        <Chip label="Errori" value={mockPrintJobs.filter((j) => j.status === "errore").length} tone="danger" />

        <select
          className={cn(inputCls, "w-auto")}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tutti gli stati</option>
          <option value="completato">Completato</option>
          <option value="in-coda">In coda</option>
          <option value="errore">Errore</option>
        </select>
      </div>

      <DataTable<PrintJob>
        columns={[
          { key: "datetime", header: "Data/Ora" },
          { key: "document", header: "Documento" },
          {
            key: "device",
            header: "Dispositivo",
            render: (r) => (
              <span className="inline-flex items-center gap-1.5">
                <Printer className="h-3.5 w-3.5 text-rw-muted" />
                {r.device}
              </span>
            ),
          },
          {
            key: "status",
            header: "Stato",
            render: (r) => {
              const icon =
                r.status === "completato" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                r.status === "in-coda" ? <Clock className="h-3.5 w-3.5" /> :
                <AlertCircle className="h-3.5 w-3.5" />;
              return (
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  r.status === "completato" && "bg-emerald-500/15 text-emerald-400",
                  r.status === "in-coda" && "bg-amber-500/15 text-amber-400",
                  r.status === "errore" && "bg-red-500/15 text-red-400",
                )}>
                  {icon}
                  {r.status === "completato" ? "Completato" : r.status === "in-coda" ? "In coda" : "Errore"}
                </span>
              );
            },
          },
        ]}
        data={filtered}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}

/* ── Main ──────────────────────────────────────────── */
export function HardwarePage() {
  const [activeTab, setActiveTab] = useState("dispositivi");

  return (
    <div className="space-y-6">
      <PageHeader title="Hardware" subtitle="Gestione stampanti, display e rotte di stampa">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-rw-soft">
            {mockDevices.filter((d) => d.status === "online").length}/{mockDevices.length} online
          </span>
        </div>
      </PageHeader>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === "dispositivi" && <DispositiviPanel />}
        {activeTab === "rotte" && <RottePanel />}
        {activeTab === "coda" && <CodaPanel />}
      </div>
    </div>
  );
}
