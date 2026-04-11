"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";

/* ── Styles ────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

/* ── Mock: Staff ───────────────────────────────────── */
type StaffMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  active: boolean;
};

const mockStaff: StaffMember[] = [
  { id: "s1", name: "Marco Rossi", role: "Admin", email: "marco@ristorante.it", active: true },
  { id: "s2", name: "Sara Bianchi", role: "Cameriere", email: "sara@ristorante.it", active: true },
  { id: "s3", name: "Luca Verdi", role: "Cameriere", email: "luca@ristorante.it", active: true },
  { id: "s4", name: "Chef Giuseppe", role: "Cucina", email: "giuseppe@ristorante.it", active: true },
  { id: "s5", name: "Anna Neri", role: "Cassa", email: "anna@ristorante.it", active: false },
];

export function OwnerPage() {
  const [staff] = useState<StaffMember[]>(mockStaff);

  return (
    <div className="space-y-6">
      <PageHeader title="Pannello Owner" subtitle="Configurazione licenza, staff e impostazioni" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Licence card */}
        <Card title="Licenza" headerRight={<Shield className="h-4 w-4 text-emerald-400" />}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Attiva</span>
            </div>
            <div className="space-y-1 text-xs text-rw-soft">
              <p>Piano: <span className="font-semibold text-rw-ink">Professional</span></p>
              <p>Scadenza: <span className="font-semibold text-rw-ink">11/04/2027</span></p>
              <p>Max utenti: <span className="font-semibold text-rw-ink">10</span></p>
            </div>
            <Chip label="Giorni rimanenti" value={365} tone="success" />
          </div>
        </Card>

        {/* Business IDs */}
        <Card title="Dati aziendali" headerRight={<Building2 className="h-4 w-4 text-rw-muted" />}>
          <div className="space-y-2 text-xs text-rw-soft">
            <div>
              <span className="text-rw-muted">Ragione sociale</span>
              <p className="font-semibold text-rw-ink">Ristorante Da Mario Srl</p>
            </div>
            <div>
              <span className="text-rw-muted">P.IVA</span>
              <p className="font-semibold text-rw-ink">IT 01234567890</p>
            </div>
            <div>
              <span className="text-rw-muted">Codice fiscale</span>
              <p className="font-semibold text-rw-ink">01234567890</p>
            </div>
            <div>
              <span className="text-rw-muted">Indirizzo</span>
              <p className="font-semibold text-rw-ink">Via Roma 42, 80100 Napoli</p>
            </div>
          </div>
        </Card>

        {/* Staff summary */}
        <Card title="Staff" headerRight={<Users className="h-4 w-4 text-rw-muted" />}>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-rw-muted">Utenti totali</span>
              <span className="text-2xl font-bold text-rw-ink">{staff.length}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-rw-muted">Attivi</span>
              <span className="text-lg font-semibold text-emerald-400">{staff.filter((s) => s.active).length}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-rw-muted">Disabilitati</span>
              <span className="text-lg font-semibold text-red-400">{staff.filter((s) => !s.active).length}</span>
            </div>
          </div>
        </Card>

        {/* Setup CTA */}
        <Card title="Setup completo" headerRight={<UserCog className="h-4 w-4 text-rw-accent" />}>
          <div className="space-y-3">
            <p className="text-xs text-rw-soft">
              Configura tutti i parametri per rendere operativo il sistema.
            </p>
            {[
              { label: "Dati aziendali", done: true },
              { label: "Configurazione SMTP", done: false },
              { label: "Staff e permessi", done: true },
              { label: "Stampanti", done: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-rw-muted" />
                )}
                <span className={item.done ? "text-rw-soft" : "text-rw-muted"}>{item.label}</span>
              </div>
            ))}
            <button type="button" className={cn(btnPrimary, "w-full mt-2")}>
              Completa setup
            </button>
          </div>
        </Card>
      </div>

      {/* Staff management */}
      <Card title="Gestione staff" headerRight={<Users className="h-4 w-4 text-rw-accent" />}>
        <form className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className={labelCls}>Nome</label>
            <input type="text" placeholder="Nome e cognome" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" placeholder="email@ristorante.it" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ruolo</label>
            <select className={inputCls}>
              <option>Admin</option>
              <option>Cameriere</option>
              <option>Cucina</option>
              <option>Cassa</option>
              <option>Bar</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className={cn(btnPrimary, "w-full")}>
              <Plus className="h-4 w-4" />
              Aggiungi
            </button>
          </div>
        </form>

        <DataTable<StaffMember>
          columns={[
            { key: "name", header: "Nome" },
            { key: "role", header: "Ruolo" },
            { key: "email", header: "Email" },
            {
              key: "active",
              header: "Stato",
              render: (r) => (
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" defaultChecked={r.active} className="peer sr-only" />
                    <div className="h-5 w-9 rounded-full bg-rw-surfaceAlt peer-checked:bg-emerald-500 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-rw-line after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                  </label>
                  <span className={cn("text-xs font-semibold", r.active ? "text-emerald-400" : "text-rw-muted")}>
                    {r.active ? "Attivo" : "Off"}
                  </span>
                </div>
              ),
            },
            {
              key: "actions",
              header: "",
              render: () => (
                <div className="flex items-center gap-2">
                  <button type="button" className="text-rw-muted hover:text-rw-accent" title="Reset password">
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button type="button" className="text-rw-muted hover:text-red-400" title="Rimuovi">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
          data={staff}
          keyExtractor={(r) => r.id}
        />
      </Card>

      {/* SMTP configuration */}
      <Card title="Configurazione SMTP" description="Impostazioni email per notifiche e conferme prenotazione" headerRight={<Mail className="h-4 w-4 text-rw-muted" />}>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className={labelCls}>Host SMTP</label>
            <input type="text" placeholder="smtp.provider.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Porta</label>
            <input type="number" placeholder="587" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>SSL/TLS</label>
            <select className={inputCls}>
              <option>TLS (porta 587)</option>
              <option>SSL (porta 465)</option>
              <option>Nessuno</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Username</label>
            <input type="text" placeholder="user@provider.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input type="password" placeholder="••••••••" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Indirizzo mittente</label>
            <input type="email" placeholder="noreply@ristorante.it" className={inputCls} />
          </div>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
            <button type="submit" className={btnPrimary}>
              <Save className="h-4 w-4" />
              Salva configurazione
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-5 py-2.5 text-sm font-semibold text-rw-muted hover:text-rw-soft">
              <RotateCcw className="h-4 w-4" />
              Svuota
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
