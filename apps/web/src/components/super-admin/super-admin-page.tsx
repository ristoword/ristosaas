"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  UnlockKeyhole,
  RefreshCcw,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { api, type AdminSystemSnapshot, type AdminUser } from "@/lib/api-client";
import { CreateTenantLicenseModal } from "@/components/super-admin/create-tenant-license-modal";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tenants", label: "Tenants" },
  { id: "licenses", label: "Licenze" },
  { id: "maintenance", label: "Manutenzione" },
  { id: "access", label: "Accessi utenti" },
  { id: "system", label: "Sistema" },
];

type Tenant = { id: string; name: string; plan: string; status: "active" | "blocked"; users: number; created: string };
type License = { id: string; key: string; tenant: string; plan: string; status: "trial" | "active" | "expired" | "suspended"; expiresAt: string; seats: number; activated: string };

const tenantStatusTone = { active: "success", blocked: "danger" } as const;
const licenseStatusTone = { trial: "warn", active: "success", expired: "danger", suspended: "warn" } as const;

function formatProcessUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}g ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}

export function SuperAdminPage() {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [emailConfigs, setEmailConfigs] = useState<Array<{
    id: string;
    tenantId: string;
    tenantName: string;
    host: string;
    port: number;
    username: string;
    fromAddress: string;
    secure: boolean;
    lastTestStatus: string | null;
    lastTestedAt: string | null;
  }>>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tempPasswordFlash, setTempPasswordFlash] = useState("");
  const [createTenantModalOpen, setCreateTenantModalOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [systemSnapshot, setSystemSnapshot] = useState<AdminSystemSnapshot | null>(null);
  const [tenantActionId, setTenantActionId] = useState<string | null>(null);

  const assistantUrl = process.env.NEXT_PUBLIC_SUPERADMIN_ASSISTANT_URL?.trim() ?? "";

  const refreshLists = useCallback(() => {
    Promise.all([api.admin.users.list(), api.admin.tenants.list(), api.admin.licenses.list(), api.admin.emailConfig.list()])
      .then(([usersRows, tenantRows, licenseRows, emailRows]) => {
        setUsers(usersRows);
        setTenants(tenantRows);
        setLicenses(
          licenseRows.map((l) => ({
            id: l.id,
            key: l.key,
            tenant: l.tenantName,
            plan: l.plan,
            status: l.status as License["status"],
            expiresAt: l.expiresAt,
            seats: l.seats,
            activated: l.activatedAt,
          })),
        );
        setEmailConfigs(emailRows);
      })
      .catch(() => {
        setUsers([]);
        setTenants([]);
        setLicenses([]);
        setEmailConfigs([]);
      });

    Promise.all([api.admin.platform.get(), api.admin.system.get()])
      .then(([platformRow, systemRow]) => {
        setMaintenanceMode(platformRow.maintenanceMode);
        setSystemSnapshot(systemRow);
        setMaintenanceError(null);
      })
      .catch((err) => {
        setMaintenanceError(err instanceof Error ? err.message : "Config piattaforma non disponibile");
        setSystemSnapshot(null);
      });
  }, []);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  const filteredTenants = tenants.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const filteredLicenses = licenses.filter((l) => l.key.toLowerCase().includes(search.toLowerCase()) || l.tenant.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <CreateTenantLicenseModal
        open={createTenantModalOpen}
        onClose={() => setCreateTenantModalOpen(false)}
        onCreated={() => refreshLists()}
      />
      <PageHeader title="Super Admin" subtitle="Pannello di controllo globale della piattaforma">
        {assistantUrl ? (
          <a
            href={assistantUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2.5 text-sm font-semibold text-rw-accent transition hover:bg-rw-accent/20"
          >
            <Sparkles className="h-4 w-4" /> AI Assistant
          </a>
        ) : (
          <span
            title="Imposta NEXT_PUBLIC_SUPERADMIN_ASSISTANT_URL per collegare un assistente esterno."
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl border border-rw-line bg-rw-surfaceAlt/60 px-4 py-2.5 text-sm font-semibold text-rw-muted opacity-70"
          >
            <Sparkles className="h-4 w-4" /> AI Assistant
          </span>
        )}
      </PageHeader>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              { label: "Tenants attivi", value: tenants.length, icon: Building2, tone: "from-emerald-500/15 to-emerald-400/5" },
              { label: "Licenze attive", value: licenses.filter((l) => l.status === "active").length, icon: Key, tone: "from-rw-accent/15 to-rw-accentSoft/10" },
              { label: "Utenti totali", value: tenants.reduce((s, t) => s + t.users, 0), icon: Activity, tone: "from-blue-500/15 to-blue-400/5" },
              {
                label: "Database",
                value: systemSnapshot ? (systemSnapshot.dbOk ? "Online" : "Offline") : "—",
                icon: HardDrive,
                tone: systemSnapshot?.dbOk === false ? "from-red-500/15 to-red-400/5" : "from-emerald-500/15 to-emerald-400/5",
              },
              {
                label: "Processo API",
                value: systemSnapshot ? formatProcessUptime(systemSnapshot.processUptimeSec) : "—",
                icon: Server,
                tone: "from-amber-400/20 to-amber-300/5",
              },
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
              data={tenants.slice(0, 3)}
              keyExtractor={(r) => r.id}
            />
          </Card>
          <Card title="Controllo completo piattaforma">
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/licenses" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm font-semibold text-rw-ink hover:border-rw-accent/30">Licenze</Link>
              <Link href="/customers" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm font-semibold text-rw-ink hover:border-rw-accent/30">Clienti (CRM)</Link>
              <Link href="/email-settings" className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm font-semibold text-rw-ink hover:border-rw-accent/30">Email / SMTP</Link>
            </div>
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
            <button
              type="button"
              onClick={() => setCreateTenantModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Nuovo tenant + licenza
            </button>
          </div>
          <DataTable
            columns={[
              { key: "name", header: "Nome" },
              { key: "plan", header: "Piano" },
              { key: "users", header: "Utenti" },
              { key: "status", header: "Stato", render: (r) => <Chip label={r.status} tone={tenantStatusTone[r.status]} /> },
              { key: "created", header: "Creato il" },
              {
                key: "actions",
                header: "",
                render: (r) => (
                  <button
                    type="button"
                    disabled={tenantActionId === r.id}
                    onClick={() => {
                      const next = r.status === "blocked" ? "active" : "blocked";
                      setTenantActionId(r.id);
                      void api.admin.tenants
                        .setAccess(r.id, next)
                        .then((updated) => {
                          setTenants((prev) => prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t)));
                        })
                        .catch(() => {})
                        .finally(() => setTenantActionId(null));
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${r.status === "blocked" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                  >
                    {r.status === "blocked" ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    {r.status === "blocked" ? "Sblocca" : "Blocca"}
                  </button>
                ),
              },
            ]}
            data={filteredTenants}
            keyExtractor={(r) => r.id}
          />
        </div>
      )}

      {tab === "licenses" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCreateTenantModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Nuovo tenant + licenza
            </button>
            <p className="text-xs text-rw-muted">Crea struttura, chiave RW-…, scadenza (1 / 6 / 12 mesi) e utente owner.</p>
          </div>
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
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${r.status === "active" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}
                  onClick={() =>
                    api.admin.licenses
                      .setStatus(r.id, r.status === "active" ? "suspended" : "active")
                      .then((updated) =>
                        setLicenses((prev) =>
                          prev.map((license) =>
                            license.id === updated.id
                              ? { ...license, status: updated.status, expiresAt: updated.expiresAt }
                              : license,
                          ),
                        ),
                      )
                  }
                >
                  {r.status === "active" ? "Disattiva" : "Attiva"}
                </button>
              )},
            ]}
            data={filteredLicenses}
            keyExtractor={(r) => r.id}
          />
          <Card title="SMTP tenant" description="Controllo configurazioni email per tenant.">
            <DataTable
              columns={[
                { key: "tenantName", header: "Tenant" },
                { key: "host", header: "Host" },
                { key: "fromAddress", header: "From" },
                { key: "lastTestStatus", header: "Test", render: (r) => r.lastTestStatus || "n/d" },
                {
                  key: "actions",
                  header: "",
                  render: (r) => (
                    <button
                      type="button"
                      className="rounded-lg bg-rw-accent/15 px-3 py-1.5 text-xs font-semibold text-rw-accent"
                      onClick={() =>
                        api.admin.emailConfig.test(r.tenantId).then((updated) => {
                          setEmailConfigs((prev) =>
                            prev.map((row) => (row.id === updated.id ? updated : row)),
                          );
                        })
                      }
                    >
                      Test SMTP
                    </button>
                  ),
                },
              ]}
              data={emailConfigs}
              keyExtractor={(r) => r.id}
            />
          </Card>
        </div>
      )}

      {tab === "maintenance" && (
        <Card title="Modalità manutenzione" description="Persistita su database: blocca login e API per tutti tranne i super admin.">
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={maintenanceBusy}
              onClick={() => {
                setMaintenanceBusy(true);
                setMaintenanceError(null);
                void api.admin.platform
                  .setMaintenanceMode(!maintenanceMode)
                  .then((row) => {
                    setMaintenanceMode(row.maintenanceMode);
                  })
                  .catch((err) => {
                    setMaintenanceError(err instanceof Error ? err.message : "Aggiornamento fallito");
                  })
                  .finally(() => setMaintenanceBusy(false));
              }}
              className="text-rw-accent disabled:opacity-50"
            >
              {maintenanceMode ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10 text-rw-muted" />}
            </button>
            <div>
              <p className="text-sm font-semibold text-rw-ink">{maintenanceMode ? "Manutenzione ATTIVA" : "Manutenzione disattivata"}</p>
              <p className="text-xs text-rw-muted">
                {maintenanceMode ? "Solo i super admin possono usare la piattaforma." : "Tutti i ruoli possono accedere normalmente."}
              </p>
            </div>
          </div>
          {maintenanceError ? <p className="mt-3 text-xs text-red-400">{maintenanceError}</p> : null}
          {maintenanceMode && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-400">Attenzione</p>
              <p className="mt-1 text-xs text-rw-soft">Gli utenti non super admin non potranno accedere finché la manutenzione è attiva.</p>
            </div>
          )}
        </Card>
      )}

      {tab === "access" && (
        <Card title="Accessi e recovery password" description="Sblocco account e password provvisorie con cambio obbligatorio al primo accesso.">
          {tempPasswordFlash ? (
            <div className="mb-4 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-3 py-2 text-sm text-rw-ink">
              {tempPasswordFlash}
            </div>
          ) : null}
          <DataTable
            columns={[
              { key: "username", header: "Username" },
              { key: "name", header: "Nome" },
              { key: "role", header: "Ruolo" },
              { key: "email", header: "Email" },
              { key: "mustChangePassword", header: "Cambio password", render: (u) => (u.mustChangePassword ? "Obbligatorio" : "OK") },
              { key: "isLocked", header: "Lock", render: (u) => (u.isLocked ? "Bloccato" : "Attivo") },
              {
                key: "actions",
                header: "",
                render: (u) => (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400"
                      onClick={() =>
                        api.admin.users.unlock(u.id).then((result) => {
                          setUsers((prev) => prev.map((user) => (user.id === result.user.id ? result.user : user)));
                        })
                      }
                    >
                      <UnlockKeyhole className="h-3.5 w-3.5" /> Sblocca
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-rw-accent/15 px-2 py-1 text-xs font-semibold text-rw-accent"
                      onClick={() =>
                        api.admin.users.generateTempPassword(u.id).then((result) => {
                          setUsers((prev) => prev.map((user) => (user.id === result.user.id ? result.user : user)));
                          setTempPasswordFlash(`Password provvisoria per ${result.user.username}: ${result.temporaryPassword}`);
                        })
                      }
                    >
                      <RefreshCcw className="h-3.5 w-3.5" /> Rigenera password
                    </button>
                  </div>
                ),
              },
            ]}
            data={users}
            keyExtractor={(u) => u.id}
          />
        </Card>
      )}

      {tab === "system" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              label: "Health",
              value: systemSnapshot ? (systemSnapshot.dbOk ? "Healthy" : "Degraded") : "—",
              icon: Activity,
              tone: systemSnapshot?.dbOk === false ? ("danger" as const) : ("success" as const),
            },
            { label: "Versione", value: systemSnapshot?.appVersion ?? "—", icon: HardDrive, tone: "info" as const },
            {
              label: "Uptime processo",
              value: systemSnapshot ? formatProcessUptime(systemSnapshot.processUptimeSec) : "—",
              icon: Server,
              tone: "accent" as const,
            },
            {
              label: "Manutenzione DB",
              value: maintenanceMode ? "ON" : "OFF",
              icon: Wrench,
              tone: maintenanceMode ? ("warn" as const) : ("success" as const),
            },
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
          <p className="col-span-full text-xs text-rw-muted">
            Ora server: {systemSnapshot?.serverTime ? new Date(systemSnapshot.serverTime).toLocaleString("it-IT") : "—"} (UTC salvato, mostrato in locale)
          </p>
        </div>
      )}
    </div>
  );
}
