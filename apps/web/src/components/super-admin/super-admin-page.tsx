"use client";

import { useState } from "react";
import {
  Activity,
  Building2,
  HardDrive,
  Key,
  Plus,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tenants", label: "Tenants" },
  { id: "licenses", label: "Licenze" },
  { id: "maintenance", label: "Manutenzione" },
  { id: "system", label: "Sistema" },
];

type Tenant = { id: string; name: string; plan: string; status: "active" | "blocked" | "trial"; users: number; created: string };
type License = { id: string; key: string; tenant: string; plan: string; status: "active" | "expired" | "suspended"; expiresAt: string; seats: number; activated: string };

const mockTenants: Tenant[] = [
  { id: "t1", name: "Trattoria Da Mario", plan: "Pro", status: "active", users: 12, created: "2025-06-15" },
  { id: "t2", name: "Pizzeria Napoli", plan: "Starter", status: "active", users: 5, created: "2025-09-02" },
  { id: "t3", name: "Ristorante Bellavista", plan: "Enterprise", status: "active", users: 34, created: "2024-11-20" },
  { id: "t4", name: "Bar Centrale", plan: "Starter", status: "trial", users: 2, created: "2026-03-28" },
  { id: "t5", name: "Osteria Il Gufo", plan: "Pro", status: "blocked", users: 8, created: "2025-01-10" },
];

const mockLicenses: License[] = [
  { id: "l1", key: "RW-PRO-A1B2C3", tenant: "Trattoria Da Mario", plan: "Pro", status: "active", expiresAt: "2027-06-15", seats: 15, activated: "2025-06-15" },
  { id: "l2", key: "RW-STR-D4E5F6", tenant: "Pizzeria Napoli", plan: "Starter", status: "active", expiresAt: "2026-09-02", seats: 5, activated: "2025-09-02" },
  { id: "l3", key: "RW-ENT-G7H8I9", tenant: "Ristorante Bellavista", plan: "Enterprise", status: "active", expiresAt: "2026-11-20", seats: 50, activated: "2024-11-20" },
  { id: "l4", key: "RW-STR-J0K1L2", tenant: "Bar Centrale", plan: "Starter", status: "active", expiresAt: "2026-04-28", seats: 3, activated: "2026-03-28" },
  { id: "l5", key: "RW-PRO-M3N4O5", tenant: "Osteria Il Gufo", plan: "Pro", status: "suspended", expiresAt: "2026-01-10", seats: 10, activated: "2025-01-10" },
  { id: "l6", key: "RW-PRO-P6Q7R8", tenant: "—", plan: "Pro", status: "expired", expiresAt: "2025-12-01", seats: 10, activated: "2024-12-01" },
  { id: "l7", key: "RW-ENT-S9T0U1", tenant: "—", plan: "Enterprise", status: "expired", expiresAt: "2025-08-15", seats: 50, activated: "2024-08-15" },
  { id: "l8", key: "RW-STR-V2W3X4", tenant: "—", plan: "Starter", status: "active", expiresAt: "2027-02-20", seats: 5, activated: "2026-02-20" },
];

const tenantStatusTone = { active: "success", blocked: "danger", trial: "warn" } as const;
const licenseStatusTone = { active: "success", expired: "danger", suspended: "warn" } as const;

export function SuperAdminPage() {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [maintenance, setMaintenance] = useState(false);

  const filteredTenants = mockTenants.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const filteredLicenses = mockLicenses.filter((l) => l.key.toLowerCase().includes(search.toLowerCase()) || l.tenant.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader title="Super Admin" subtitle="Pannello di controllo globale della piattaforma">
        <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2.5 text-sm font-semibold text-rw-accent transition hover:bg-rw-accent/20">
          <Sparkles className="h-4 w-4" /> AI Assistant
        </button>
      </PageHeader>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Tenants attivi", value: mockTenants.filter((t) => t.status === "active").length, icon: Building2, tone: "from-emerald-500/15 to-emerald-400/5" },
              { label: "Licenze attive", value: mockLicenses.filter((l) => l.status === "active").length, icon: Key, tone: "from-rw-accent/15 to-rw-accentSoft/10" },
              { label: "Utenti totali", value: mockTenants.reduce((s, t) => s + t.users, 0), icon: Activity, tone: "from-blue-500/15 to-blue-400/5" },
              { label: "Uptime", value: "99.97%", icon: Server, tone: "from-amber-400/20 to-amber-300/5" },
            ].map((s) => (
              <article key={s.label} className={`rounded-2xl border border-rw-line bg-gradient-to-br p-5 shadow-sm ${s.tone}`}>
                <div className="flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-rw-accent" />
                  <p className="text-sm font-medium text-rw-muted">{s.label}</p>
                </div>
                <p className="mt-2 font-display text-3xl font-semibold text-rw-ink">{s.value}</p>
              </article>
            ))}
          </div>
          <Card title="Ultimi tenants registrati">
            <DataTable
              columns={[
                { key: "name", header: "Nome" },
                { key: "plan", header: "Piano" },
                { key: "status", header: "Stato", render: (r) => <Chip label={r.status} tone={tenantStatusTone[r.status]} /> },
                { key: "created", header: "Creato il" },
              ]}
              data={mockTenants.slice(0, 3)}
              keyExtractor={(r) => r.id}
            />
          </Card>
        </div>
      )}

      {tab === "tenants" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca tenant…" className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-4 text-sm text-rw-ink placeholder:text-rw-muted" />
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> Nuovo tenant
            </button>
          </div>
          <DataTable
            columns={[
              { key: "name", header: "Nome" },
              { key: "plan", header: "Piano" },
              { key: "users", header: "Utenti" },
              { key: "status", header: "Stato", render: (r) => <Chip label={r.status} tone={tenantStatusTone[r.status]} /> },
              { key: "created", header: "Creato il" },
              { key: "actions", header: "", render: (r) => (
                <button type="button" className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${r.status === "blocked" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {r.status === "blocked" ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                  {r.status === "blocked" ? "Sblocca" : "Blocca"}
                </button>
              )},
            ]}
            data={filteredTenants}
            keyExtractor={(r) => r.id}
          />
        </div>
      )}

      {tab === "licenses" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca chiave o tenant…" className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-4 text-sm text-rw-ink placeholder:text-rw-muted" />
          </div>
          <DataTable
            columns={[
              { key: "key", header: "Chiave", render: (r) => <code className="rounded bg-rw-surfaceAlt px-1.5 py-0.5 text-xs text-rw-accent">{r.key}</code> },
              { key: "tenant", header: "Tenant" },
              { key: "plan", header: "Piano" },
              { key: "seats", header: "Posti" },
              { key: "status", header: "Stato", render: (r) => <Chip label={r.status} tone={licenseStatusTone[r.status]} /> },
              { key: "expiresAt", header: "Scadenza" },
              { key: "actions", header: "", render: (r) => (
                <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${r.status === "active" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {r.status === "active" ? "Disattiva" : "Attiva"}
                </button>
              )},
            ]}
            data={filteredLicenses}
            keyExtractor={(r) => r.id}
          />
        </div>
      )}

      {tab === "maintenance" && (
        <Card title="Modalità manutenzione" description="Attiva per bloccare l'accesso a tutti i tenants durante aggiornamenti.">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setMaintenance(!maintenance)} className="text-rw-accent">
              {maintenance ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10 text-rw-muted" />}
            </button>
            <div>
              <p className="text-sm font-semibold text-rw-ink">{maintenance ? "Manutenzione ATTIVA" : "Manutenzione disattivata"}</p>
              <p className="text-xs text-rw-muted">{maintenance ? "I tenants vedono una pagina di cortesia." : "Tutti i servizi sono operativi."}</p>
            </div>
          </div>
          {maintenance && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-400">Attenzione</p>
              <p className="mt-1 text-xs text-rw-soft">Gli utenti non potranno accedere finché la manutenzione è attiva. Pianifica con cura.</p>
            </div>
          )}
        </Card>
      )}

      {tab === "system" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Health", value: "Healthy", icon: Activity, tone: "success" as const },
            { label: "Versione", value: "v2.4.1", icon: HardDrive, tone: "info" as const },
            { label: "Uptime", value: "47d 13h 22m", icon: Server, tone: "accent" as const },
            { label: "Manutenzione", value: maintenance ? "ON" : "OFF", icon: Wrench, tone: maintenance ? ("warn" as const) : ("success" as const) },
          ].map((s) => (
            <Card key={s.label} title={s.label}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surfaceAlt text-rw-accent ring-1 ring-rw-line">
                  <s.icon className="h-5 w-5" />
                </span>
                <Chip label={s.label} value={s.value} tone={s.tone} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
