"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  Send,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";

const profile = {
  name: "Marco Rossi",
  role: "Cameriere",
  email: "marco.rossi@ristoword.it",
  avatar: "MR",
  phone: "+39 333 1234567",
  hireDate: "2024-03-01",
};

const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const shifts = [
  { day: "Lun", shift: "11:00–15:00", type: "Pranzo" },
  { day: "Mar", shift: "18:00–23:00", type: "Cena" },
  { day: "Mer", shift: "—", type: "Riposo" },
  { day: "Gio", shift: "11:00–15:00", type: "Pranzo" },
  { day: "Ven", shift: "18:00–23:00", type: "Cena" },
  { day: "Sab", shift: "11:00–15:00 / 18:00–23:30", type: "Doppio" },
  { day: "Dom", shift: "—", type: "Riposo" },
];

type LeaveRequest = { id: string; type: string; from: string; to: string; status: "approved" | "pending" | "denied"; note: string };

const leaveRequests: LeaveRequest[] = [
  { id: "lr1", type: "Ferie", from: "2026-05-01", to: "2026-05-07", status: "approved", note: "Vacanza" },
  { id: "lr2", type: "Permesso", from: "2026-04-18", to: "2026-04-18", status: "pending", note: "Visita medica" },
  { id: "lr3", type: "Ferie", from: "2026-08-10", to: "2026-08-24", status: "pending", note: "Ferie estive" },
  { id: "lr4", type: "Malattia", from: "2026-03-02", to: "2026-03-03", status: "approved", note: "Influenza" },
];

type AttendanceEntry = { id: string; date: string; clockIn: string; clockOut: string; hours: string };

const attendance: AttendanceEntry[] = [
  { id: "a1", date: "2026-04-11", clockIn: "10:55", clockOut: "15:05", hours: "4h 10m" },
  { id: "a2", date: "2026-04-10", clockIn: "17:50", clockOut: "23:15", hours: "5h 25m" },
  { id: "a3", date: "2026-04-08", clockIn: "10:58", clockOut: "15:02", hours: "4h 04m" },
  { id: "a4", date: "2026-04-07", clockIn: "17:45", clockOut: "23:30", hours: "5h 45m" },
  { id: "a5", date: "2026-04-05", clockIn: "10:50", clockOut: "15:10", hours: "4h 20m" },
];

const leaveStatusTone = { approved: "success", pending: "warn", denied: "danger" } as const;

export function StaffMePage() {
  const [leaveType, setLeaveType] = useState("Ferie");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [leaveNote, setLeaveNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmitLeave() {
    if (!leaveFrom) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setLeaveFrom(""); setLeaveTo(""); setLeaveNote(""); }, 1200);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Il mio profilo" subtitle="Gestisci i tuoi dati, turni e richieste" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rw-accent/15 font-display text-2xl font-bold text-rw-accent ring-2 ring-rw-accent/30">
              {profile.avatar}
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-rw-ink">{profile.name}</p>
              <Chip label={profile.role} tone="accent" className="mt-1" />
            </div>
            <div className="mt-2 w-full space-y-2 text-left">
              {[
                { icon: User, label: profile.email },
                { icon: Clock, label: `Assunto il ${profile.hireDate}` },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs text-rw-soft">
                  <item.icon className="h-3.5 w-3.5 text-rw-accent" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="I miei turni — Settimana corrente" className="lg:col-span-2">
          <div className="grid grid-cols-7 gap-1">
            {shifts.map((s) => (
              <div
                key={s.day}
                className={`flex flex-col items-center rounded-xl border p-2 text-center ${s.type === "Riposo" ? "border-rw-line bg-rw-surfaceAlt" : "border-rw-accent/20 bg-rw-accent/5"}`}
              >
                <span className="text-[11px] font-semibold uppercase text-rw-muted">{s.day}</span>
                <span className="mt-1 text-[11px] font-semibold text-rw-ink">{s.shift}</span>
                <Chip label={s.type} tone={s.type === "Riposo" ? "default" : s.type === "Doppio" ? "warn" : "accent"} className="mt-1 scale-[0.8]" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Richiesta ferie / permesso">
        <div className="grid gap-3 sm:grid-cols-4">
          <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink">
            <option>Ferie</option>
            <option>Permesso</option>
            <option>Malattia</option>
          </select>
          <input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" />
          <input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink" />
          <button type="button" onClick={handleSubmitLeave} disabled={submitting || !leaveFrom} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Invia
          </button>
        </div>
        <input value={leaveNote} onChange={(e) => setLeaveNote(e.target.value)} placeholder="Note (opzionale)" className="mt-3 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted" />
      </Card>

      <Card title="Le mie richieste">
        <DataTable
          columns={[
            { key: "type", header: "Tipo" },
            { key: "from", header: "Dal" },
            { key: "to", header: "Al" },
            { key: "status", header: "Stato", render: (r) => <Chip label={r.status} tone={leaveStatusTone[r.status]} /> },
            { key: "note", header: "Note" },
          ]}
          data={leaveRequests}
          keyExtractor={(r) => r.id}
        />
      </Card>

      <Card title="Presenze recenti" headerRight={<div className="flex gap-2"><Chip label="Questo mese" value="19h 44m" tone="accent" /></div>}>
        <DataTable
          columns={[
            { key: "date", header: "Data" },
            { key: "clockIn", header: "Entrata", render: (r) => <span className="inline-flex items-center gap-1 text-emerald-400"><LogIn className="h-3.5 w-3.5" />{r.clockIn}</span> },
            { key: "clockOut", header: "Uscita", render: (r) => <span className="inline-flex items-center gap-1 text-red-400"><LogOut className="h-3.5 w-3.5" />{r.clockOut}</span> },
            { key: "hours", header: "Ore" },
          ]}
          data={attendance}
          keyExtractor={(r) => r.id}
        />
      </Card>

      <Card title="Documenti" headerRight={<Chip label="3 file" tone="info" />}>
        <ul className="space-y-2">
          {["Contratto di assunzione.pdf", "Busta paga — Marzo 2026.pdf", "Certificato HACCP.pdf"].map((doc) => (
            <li key={doc} className="flex items-center gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
              <FileText className="h-4 w-4 text-rw-accent" />
              <span className="flex-1 text-sm text-rw-ink">{doc}</span>
              <button type="button" className="text-xs font-semibold text-rw-accent">Scarica</button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
