"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileBarChart,
  LogIn,
  LogOut,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";

const tabs = [
  { id: "presenze", label: "Presenze" },
  { id: "ferie", label: "Ferie / Permessi" },
  { id: "pagamenti", label: "Pagamenti" },
  { id: "disciplina", label: "Disciplina" },
  { id: "report", label: "Report" },
];

type Employee = { id: string; name: string; role: string; };

const employees: Employee[] = [
  { id: "e1", name: "Marco Rossi", role: "Cameriere" },
  { id: "e2", name: "Giulia Bianchi", role: "Chef" },
  { id: "e3", name: "Luca Verdi", role: "Barista" },
  { id: "e4", name: "Sara Conti", role: "Cameriere" },
  { id: "e5", name: "Andrea Marino", role: "Lavapiatti" },
  { id: "e6", name: "Elena Ferrara", role: "Sous-chef" },
];

type Attendance = { id: string; empId: string; name: string; date: string; clockIn: string; clockOut: string; hours: string; };

const attendanceData: Attendance[] = [
  { id: "at1", empId: "e1", name: "Marco Rossi", date: "2026-04-11", clockIn: "10:55", clockOut: "15:05", hours: "4h 10m" },
  { id: "at2", empId: "e2", name: "Giulia Bianchi", date: "2026-04-11", clockIn: "08:00", clockOut: "16:00", hours: "8h 00m" },
  { id: "at3", empId: "e3", name: "Luca Verdi", date: "2026-04-11", clockIn: "16:00", clockOut: "00:15", hours: "8h 15m" },
  { id: "at4", empId: "e4", name: "Sara Conti", date: "2026-04-11", clockIn: "17:50", clockOut: "23:15", hours: "5h 25m" },
  { id: "at5", empId: "e5", name: "Andrea Marino", date: "2026-04-11", clockIn: "09:00", clockOut: "17:00", hours: "8h 00m" },
  { id: "at6", empId: "e6", name: "Elena Ferrara", date: "2026-04-11", clockIn: "08:30", clockOut: "16:30", hours: "8h 00m" },
];

type LeaveReq = { id: string; name: string; type: string; from: string; to: string; status: "approved" | "pending" | "denied"; };

const leaveData: LeaveReq[] = [
  { id: "lv1", name: "Marco Rossi", type: "Ferie", from: "2026-05-01", to: "2026-05-07", status: "pending" },
  { id: "lv2", name: "Giulia Bianchi", type: "Permesso", from: "2026-04-20", to: "2026-04-20", status: "approved" },
  { id: "lv3", name: "Sara Conti", type: "Ferie", from: "2026-08-01", to: "2026-08-14", status: "pending" },
  { id: "lv4", name: "Andrea Marino", type: "Malattia", from: "2026-03-10", to: "2026-03-12", status: "approved" },
  { id: "lv5", name: "Luca Verdi", type: "Permesso", from: "2026-04-25", to: "2026-04-25", status: "denied" },
  { id: "lv6", name: "Elena Ferrara", type: "Ferie", from: "2026-07-15", to: "2026-07-28", status: "pending" },
];

type Payroll = { id: string; name: string; role: string; baseSalary: number; bonus: number; deductions: number; net: number; };

const payrollData: Payroll[] = [
  { id: "p1", name: "Marco Rossi", role: "Cameriere", baseSalary: 1400, bonus: 120, deductions: 280, net: 1240 },
  { id: "p2", name: "Giulia Bianchi", role: "Chef", baseSalary: 2200, bonus: 200, deductions: 450, net: 1950 },
  { id: "p3", name: "Luca Verdi", role: "Barista", baseSalary: 1350, bonus: 80, deductions: 260, net: 1170 },
  { id: "p4", name: "Sara Conti", role: "Cameriere", baseSalary: 1400, bonus: 100, deductions: 280, net: 1220 },
  { id: "p5", name: "Andrea Marino", role: "Lavapiatti", baseSalary: 1200, bonus: 50, deductions: 230, net: 1020 },
  { id: "p6", name: "Elena Ferrara", role: "Sous-chef", baseSalary: 1800, bonus: 150, deductions: 370, net: 1580 },
];

type DisciplineNote = { id: string; name: string; date: string; type: "nota" | "richiamo" | "sospensione"; detail: string; };

const disciplineData: DisciplineNote[] = [
  { id: "d1", name: "Luca Verdi", date: "2026-03-15", type: "nota", detail: "Ritardo ripetuto all'apertura del bar." },
  { id: "d2", name: "Andrea Marino", date: "2026-02-20", type: "richiamo", detail: "Mancato rispetto delle norme igieniche." },
  { id: "d3", name: "Marco Rossi", date: "2026-01-10", type: "nota", detail: "Assenza non comunicata al turno serale." },
];

const leaveStatusTone = { approved: "success", pending: "warn", denied: "danger" } as const;
const disciplineTone = { nota: "info", richiamo: "warn", sospensione: "danger" } as const;

const euro = (n: number) => `€ ${n.toLocaleString("it-IT")}`;

export function StaffHrPage() {
  const [tab, setTab] = useState("presenze");

  return (
    <div className="space-y-6">
      <PageHeader title="Gestione personale" subtitle="Presenze, ferie, pagamenti e report del team" />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "presenze" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card title="Presenti oggi"><p className="font-display text-3xl font-semibold text-emerald-400">{attendanceData.length}</p></Card>
            <Card title="Ore totali oggi"><p className="font-display text-3xl font-semibold text-rw-accent">{attendanceData.reduce((s, a) => s + parseFloat(a.hours), 0).toFixed(0)}h</p></Card>
            <Card title="Dipendenti"><p className="font-display text-3xl font-semibold text-rw-ink">{employees.length}</p></Card>
          </div>
          <Card title="Timbrature di oggi">
            <DataTable
              columns={[
                { key: "name", header: "Dipendente", render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span> },
                { key: "clockIn", header: "Entrata", render: (r) => <span className="inline-flex items-center gap-1 text-emerald-400"><LogIn className="h-3.5 w-3.5" />{r.clockIn}</span> },
                { key: "clockOut", header: "Uscita", render: (r) => <span className="inline-flex items-center gap-1 text-red-400"><LogOut className="h-3.5 w-3.5" />{r.clockOut}</span> },
                { key: "hours", header: "Ore" },
              ]}
              data={attendanceData}
              keyExtractor={(r) => r.id}
            />
          </Card>
        </div>
      )}

      {tab === "ferie" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card title="In attesa"><p className="font-display text-3xl font-semibold text-amber-400">{leaveData.filter((l) => l.status === "pending").length}</p></Card>
            <Card title="Approvate"><p className="font-display text-3xl font-semibold text-emerald-400">{leaveData.filter((l) => l.status === "approved").length}</p></Card>
            <Card title="Rifiutate"><p className="font-display text-3xl font-semibold text-red-400">{leaveData.filter((l) => l.status === "denied").length}</p></Card>
          </div>
          <Card title="Richieste ferie e permessi">
            <DataTable
              columns={[
                { key: "name", header: "Dipendente", render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span> },
                { key: "type", header: "Tipo" },
                { key: "from", header: "Dal" },
                { key: "to", header: "Al" },
                { key: "status", header: "Stato", render: (r) => <Chip label={r.status} tone={leaveStatusTone[r.status]} /> },
                { key: "actions", header: "", render: (r) => r.status === "pending" ? (
                  <div className="flex gap-1">
                    <button type="button" className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400"><CheckCircle2 className="h-4 w-4" /></button>
                    <button type="button" className="rounded-lg bg-red-500/10 p-1.5 text-red-400"><XCircle className="h-4 w-4" /></button>
                  </div>
                ) : null },
              ]}
              data={leaveData}
              keyExtractor={(r) => r.id}
            />
          </Card>
        </div>
      )}

      {tab === "pagamenti" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card title="Totale stipendi netti"><p className="font-display text-3xl font-semibold text-rw-accent">{euro(payrollData.reduce((s, p) => s + p.net, 0))}</p></Card>
            <Card title="Totale bonus"><p className="font-display text-3xl font-semibold text-emerald-400">{euro(payrollData.reduce((s, p) => s + p.bonus, 0))}</p></Card>
            <Card title="Totale deduzioni"><p className="font-display text-3xl font-semibold text-red-400">{euro(payrollData.reduce((s, p) => s + p.deductions, 0))}</p></Card>
          </div>
          <Card title="Paghe — Aprile 2026">
            <DataTable
              columns={[
                { key: "name", header: "Dipendente", render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span> },
                { key: "role", header: "Ruolo" },
                { key: "baseSalary", header: "Base", render: (r) => euro(r.baseSalary) },
                { key: "bonus", header: "Bonus", render: (r) => <span className="text-emerald-400">+{euro(r.bonus)}</span> },
                { key: "deductions", header: "Deduzioni", render: (r) => <span className="text-red-400">-{euro(r.deductions)}</span> },
                { key: "net", header: "Netto", render: (r) => <span className="font-semibold text-rw-accent">{euro(r.net)}</span> },
              ]}
              data={payrollData}
              keyExtractor={(r) => r.id}
            />
          </Card>
        </div>
      )}

      {tab === "disciplina" && (
        <Card title="Note disciplinari">
          <DataTable
            columns={[
              { key: "name", header: "Dipendente", render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span> },
              { key: "date", header: "Data" },
              { key: "type", header: "Tipo", render: (r) => <Chip label={r.type} tone={disciplineTone[r.type]} /> },
              { key: "detail", header: "Dettaglio" },
            ]}
            data={disciplineData}
            keyExtractor={(r) => r.id}
          />
        </Card>
      )}

      {tab === "report" && (
        <div className="space-y-4">
          <Card title="Riepilogo ore — Aprile 2026">
            <DataTable
              columns={[
                { key: "name", header: "Dipendente", render: (r) => <span className="font-semibold text-rw-ink">{r.name}</span> },
                { key: "role", header: "Ruolo" },
                { key: "hours", header: "Ore mese", render: (r) => {
                  const h = [162, 176, 170, 158, 168, 174][employees.indexOf(r)];
                  return <span className="font-semibold text-rw-accent">{h}h</span>;
                }},
                { key: "cost", header: "Costo lordo", render: (r) => {
                  const p = payrollData.find((p) => p.name === r.name);
                  return euro(p ? p.baseSalary + p.bonus : 0);
                }},
              ]}
              data={employees}
              keyExtractor={(r) => r.id}
            />
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Costo totale personale">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-rw-accent" />
                <p className="font-display text-3xl font-semibold text-rw-ink">{euro(payrollData.reduce((s, p) => s + p.baseSalary + p.bonus, 0))}</p>
              </div>
            </Card>
            <Card title="Media ore/dipendente">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-rw-accent" />
                <p className="font-display text-3xl font-semibold text-rw-ink">168h</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
