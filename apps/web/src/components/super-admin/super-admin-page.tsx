"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BadgeEuro,
  Building2,
  Eye,
  EyeOff,
  Globe,
  Handshake,
  HardDrive,
  Key,
  Monitor,
  Plus,
  Radio,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  UnlockKeyhole,
  RefreshCcw,
  Users,
  UserPlus,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { api, type AdminEmailConfig, type AdminSystemSnapshot, type AdminUser } from "@/lib/api-client";
import { CreateTenantLicenseModal } from "@/components/super-admin/create-tenant-license-modal";
import { UserAccessReportPanel } from "@/components/admin/user-access-report-panel";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "monitor", label: "Monitor Live" },
  { id: "tenants", label: "Tenants" },
  { id: "licenses", label: "Licenze" },
  { id: "dealer", label: "Dealer / Reseller" },
  { id: "groups", label: "Gruppi Multi-locale" },
  { id: "maintenance", label: "Manutenzione" },
  { id: "access", label: "Accessi utenti" },
  { id: "system", label: "Sistema" },
];

type Tenant = { id: string; name: string; plan: string; status: "active" | "blocked"; users: number; created: string };
type License = { id: string; key: string; tenant: string; plan: string; status: "trial" | "active" | "expired" | "suspended"; expiresAt: string; seats: number; activated: string };

const tenantStatusTone = { active: "success", blocked: "danger" } as const;
const licenseStatusTone = { trial: "warn", active: "success", expired: "danger", suspended: "warn" } as const;

function formatRelativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Ora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ore fa`;
  return `${Math.floor(diff / 86400)} giorni fa`;
}

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
  const [emailConfigs, setEmailConfigs] = useState<AdminEmailConfig[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [createTenantModalOpen, setCreateTenantModalOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [systemSnapshot, setSystemSnapshot] = useState<AdminSystemSnapshot | null>(null);
  const [tenantActionId, setTenantActionId] = useState<string | null>(null);
  const [listLoadError, setListLoadError] = useState<string | null>(null);

  type OnlineUser = {
    sessionId: string;
    userId: string;
    username: string;
    name: string;
    role: string;
    tenantId: string | null;
    tenantName: string;
    ipAddress: string;
    userAgent: string;
    lastSeenAt: string;
    issuedAt: string;
  };
  type OnlineSummary = { totalOnline: number; tenantsOnline: number; activeSessions: number; thresholdMinutes: number };
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineSummary, setOnlineSummary] = useState<OnlineSummary | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  type GroupMember = {
    id: string;
    tenantId: string;
    label: string | null;
    tenantName: string;
    tenantSlug: string;
    tenantPlan: string;
    tenantStatus: string;
    addedAt: string;
  };
  type TenantGroupRow = {
    id: string;
    name: string;
    createdAt: string;
    members: GroupMember[];
  };

  const [groups, setGroups] = useState<TenantGroupRow[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [addTenantToGroupId, setAddTenantToGroupId] = useState<string | null>(null);
  const [addTenantValue, setAddTenantValue] = useState("");

  type DealerPartner = {
    id: string; code: string; name: string; country: string;
    email: string; phone: string; notes: string;
    commissionType: string; licensePrice: number; commissionEuros: number; commissionPct: number;
    allInclusivePrice: number | null; allInclusiveCommission: number | null; allInclusivePct: number | null;
    active: boolean; _count?: { licenses: number };
  };
  const [dealerUsers, setDealerUsers] = useState<AdminUser[]>([]);
  const [dealerPartners, setDealerPartners] = useState<DealerPartner[]>([]);
  const [dealerLoading, setDealerLoading] = useState(false);
  const [dealerError, setDealerError] = useState<string | null>(null);
  const [dealerFlash, setDealerFlash] = useState<string>("");
  const [showCreateDealer, setShowCreateDealer] = useState(false);
  const [newDealer, setNewDealer] = useState({ username: "", name: "", email: "", password: "", partnerCode: "" });

  const assistantUrl = process.env.NEXT_PUBLIC_SUPERADMIN_ASSISTANT_URL?.trim() ?? "";

  const refreshOnline = useCallback(async () => {
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      const res = await fetch("/api/admin/online", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { onlineUsers: OnlineUser[]; summary: OnlineSummary };
      setOnlineUsers(json.onlineUsers);
      setOnlineSummary(json.summary);
    } catch (e) {
      setOnlineError(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setOnlineLoading(false);
    }
  }, []);

  const refreshGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const res = await fetch("/api/admin/tenant-groups", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as TenantGroupRow[];
      setGroups(json);
    } catch (e) {
      setGroupsError(e instanceof Error ? e.message : "Errore caricamento gruppi");
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const refreshDealers = useCallback(async () => {
    setDealerLoading(true);
    setDealerError(null);
    try {
      const [usersRes, partnersRes] = await Promise.all([
        api.admin.users.list(),
        fetch("/api/reseller/partners", { cache: "no-store" }).then((r) => r.ok ? r.json() : { data: [] }),
      ]);
      setDealerUsers(usersRes.filter((u: AdminUser) => u.role === "reseller"));
      setDealerPartners((partnersRes as { data?: DealerPartner[] }).data ?? partnersRes ?? []);
    } catch (e) {
      setDealerError(e instanceof Error ? e.message : "Errore caricamento dealer");
    } finally {
      setDealerLoading(false);
    }
  }, []);

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch("/api/admin/tenant-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error ?? `HTTP ${res.status}`);
      }
      setNewGroupName("");
      await refreshGroups();
    } catch (e) {
      setGroupsError(e instanceof Error ? e.message : "Errore creazione gruppo");
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm("Eliminare questo gruppo? I tenant non verranno eliminati.")) return;
    try {
      await fetch(`/api/admin/tenant-groups/${id}`, { method: "DELETE" });
      await refreshGroups();
    } catch (e) {
      setGroupsError(e instanceof Error ? e.message : "Errore eliminazione gruppo");
    }
  }

  async function handleAddTenantToGroup(groupId: string) {
    const tenantId = addTenantValue.trim();
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/admin/tenant-groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addTenantIds: [tenantId] }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error ?? `HTTP ${res.status}`);
      }
      setAddTenantValue("");
      setAddTenantToGroupId(null);
      await refreshGroups();
    } catch (e) {
      setGroupsError(e instanceof Error ? e.message : "Errore aggiunta tenant");
    }
  }

  async function handleRemoveTenantFromGroup(groupId: string, tenantId: string) {
    try {
      await fetch(`/api/admin/tenant-groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeTenantIds: [tenantId] }),
      });
      await refreshGroups();
    } catch (e) {
      setGroupsError(e instanceof Error ? e.message : "Errore rimozione tenant");
    }
  }

  const refreshLists = useCallback(() => {
    Promise.all([api.admin.users.list(), api.admin.tenants.list(), api.admin.licenses.list(), api.admin.emailConfig.list()])
      .then(([usersRows, tenantRows, licenseRows, emailRows]) => {
        setListLoadError(null);
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
      .catch((err) => {
        setListLoadError(err instanceof Error ? err.message : "Caricamento dati fallito. I dati nel database non sono stati cancellati: verifica la connessione o le migrazioni.");
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

  useEffect(() => {
    if (tab !== "monitor") return;
    void refreshOnline();
    const interval = setInterval(() => void refreshOnline(), 30_000);
    return () => clearInterval(interval);
  }, [tab, refreshOnline]);

  useEffect(() => {
    if (tab === "groups") void refreshGroups();
  }, [tab, refreshGroups]);

  useEffect(() => {
    if (tab === "dealer") void refreshDealers();
  }, [tab, refreshDealers]);

  async function handleCreateDealer() {
    setDealerError(null);
    try {
      const result = await api.admin.users.create({
        username: newDealer.username,
        name: newDealer.name,
        email: newDealer.email,
        password: newDealer.password,
        role: "reseller",
        ...(newDealer.partnerCode ? { partnerCode: newDealer.partnerCode } : {}),
      } as Parameters<typeof api.admin.users.create>[0]);
      setDealerFlash(`Dealer "${result.user.username}" creato. Password: ${result.password}`);
      setNewDealer({ username: "", name: "", email: "", password: "", partnerCode: "" });
      setShowCreateDealer(false);
      void refreshDealers();
    } catch (e) {
      setDealerError(e instanceof Error ? e.message : "Errore creazione dealer");
    }
  }

  const filteredTenants = tenants.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const filteredLicenses = licenses.filter((l) => l.key.toLowerCase().includes(search.toLowerCase()) || l.tenant.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {listLoadError ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold text-amber-200">Errore caricamento Super Admin</p>
          <p className="mt-1 text-xs text-rw-soft">{listLoadError}</p>
          <p className="mt-2 text-xs text-rw-muted">
            Se hai aggiornato il codice senza aggiornare il database, esegui sul PostgreSQL lo script{" "}
            <code className="rounded bg-rw-surfaceAlt px-1">apps/web/prisma/migrations_add_platform_and_tenant_access.sql</code> poi ricarica.
          </p>
        </div>
      ) : null}
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

      {tab === "monitor" && (
        <div className="space-y-4">
          {/* Header con pulsante aggiorna */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
              <p className="text-sm text-rw-muted">
                Aggiornamento automatico ogni 30s — ultimi {onlineSummary?.thresholdMinutes ?? 15} minuti di attività
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshOnline()}
              disabled={onlineLoading}
              className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surface px-4 py-2 text-sm font-semibold text-rw-ink hover:bg-rw-surfaceAlt disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${onlineLoading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
          </div>

          {onlineError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {onlineError}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-rw-line bg-gradient-to-br from-emerald-500/15 to-emerald-400/5 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <p className="text-sm font-medium text-rw-muted">Persone online</p>
              </div>
              <p className="mt-2 font-display text-4xl font-bold tabular-nums text-emerald-400">
                {onlineSummary?.totalOnline ?? "—"}
              </p>
            </article>
            <article className="rounded-2xl border border-rw-line bg-gradient-to-br from-blue-500/15 to-blue-400/5 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-400" />
                <p className="text-sm font-medium text-rw-muted">Locali online</p>
              </div>
              <p className="mt-2 font-display text-4xl font-bold tabular-nums text-blue-400">
                {onlineSummary?.tenantsOnline ?? "—"}
              </p>
            </article>
            <article className="rounded-2xl border border-rw-line bg-gradient-to-br from-amber-500/15 to-amber-400/5 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-medium text-rw-muted">Sessioni attive</p>
              </div>
              <p className="mt-2 font-display text-4xl font-bold tabular-nums text-amber-400">
                {onlineSummary?.activeSessions ?? "—"}
              </p>
            </article>
          </div>

          {/* Tabella utenti connessi */}
          <Card title="Utenti connessi in tempo reale" description="Ogni riga è un utente attivo negli ultimi minuti.">
            {onlineLoading && onlineUsers.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-rw-muted text-sm">
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> Caricamento…
              </div>
            ) : onlineUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-rw-muted">
                <Users className="h-10 w-10 opacity-30" />
                <p className="text-sm">Nessun utente connesso al momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rw-line bg-rw-surfaceAlt/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Utente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Ruolo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Locale</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">IP</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Dispositivo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Ultima attività</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rw-line">
                    {onlineUsers.map((u) => (
                      <tr key={u.sessionId} className="hover:bg-rw-surfaceAlt/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                            <div>
                              <p className="font-medium text-rw-ink">{u.name}</p>
                              <p className="text-xs text-rw-muted">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            u.role === "super_admin" ? "border-purple-500/30 bg-purple-500/15 text-purple-400" :
                            u.role === "owner" ? "border-amber-500/30 bg-amber-500/15 text-amber-400" :
                            u.role === "admin" ? "border-blue-500/30 bg-blue-500/15 text-blue-400" :
                            u.role === "reseller" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" :
                            "border-rw-line bg-rw-surfaceAlt text-rw-soft"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-rw-muted" />
                            <span className="text-rw-ink">{u.tenantName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-rw-muted" />
                            <code className="rounded bg-rw-surfaceAlt px-1.5 py-0.5 text-xs text-rw-soft">{u.ipAddress}</code>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {u.userAgent.includes("iOS") || u.userAgent.includes("Android") ? (
                              <Smartphone className="h-3.5 w-3.5 text-rw-muted" />
                            ) : (
                              <Monitor className="h-3.5 w-3.5 text-rw-muted" />
                            )}
                            <span className="text-rw-soft text-xs">{u.userAgent}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-rw-soft">
                          {formatRelativeTime(u.lastSeenAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Riepilogo per locale */}
          {onlineUsers.length > 0 && (
            <Card title="Dettaglio per locale" description="Quanti utenti sono connessi per ogni locale/ristorante.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(
                  onlineUsers.reduce<Record<string, { name: string; count: number; roles: string[] }>>((acc, u) => {
                    const key = u.tenantId ?? "unknown";
                    if (!acc[key]) acc[key] = { name: u.tenantName, count: 0, roles: [] };
                    acc[key].count++;
                    if (!acc[key].roles.includes(u.role)) acc[key].roles.push(u.role);
                    return acc;
                  }, {}),
                )
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([tid, info]) => (
                    <div key={tid} className="flex items-center justify-between rounded-xl border border-rw-line bg-rw-surface p-4">
                      <div>
                        <p className="font-medium text-rw-ink">{info.name}</p>
                        <p className="text-xs text-rw-muted">{info.roles.join(", ")}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-lg font-bold tabular-nums text-emerald-400">{info.count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
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
        <UserAccessReportPanel
          mode="operational"
          apiPath="/admin/user-access"
          title="Accessi utenti piattaforma"
          description="Monitoraggio login, utenti mai entrati, online ora e azioni di recovery (sblocco, password provvisoria, cambio obbligatorio)."
        />
      )}

      {tab === "dealer" && (
        <div className="space-y-4">
          {dealerFlash && (
            <div className="rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-3 text-sm text-rw-ink">
              <p className="font-semibold text-rw-accent">Dealer creato con successo</p>
              <p className="mt-1 text-xs">{dealerFlash}</p>
              <button type="button" onClick={() => setDealerFlash("")} className="mt-2 text-xs text-rw-muted hover:text-rw-soft">Chiudi</button>
            </div>
          )}
          {dealerError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{dealerError}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-rw-line bg-gradient-to-br from-emerald-500/15 to-emerald-400/5 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-emerald-400" />
                <p className="text-sm font-medium text-rw-muted">Partner registrati</p>
              </div>
              <p className="mt-2 font-display text-3xl font-semibold text-emerald-400">{dealerPartners.length}</p>
            </article>
            <article className="rounded-2xl border border-rw-line bg-gradient-to-br from-blue-500/15 to-blue-400/5 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <p className="text-sm font-medium text-rw-muted">Utenti dealer</p>
              </div>
              <p className="mt-2 font-display text-3xl font-semibold text-blue-400">{dealerUsers.length}</p>
            </article>
            <article className="rounded-2xl border border-rw-line bg-gradient-to-br from-amber-500/15 to-amber-400/5 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <BadgeEuro className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-medium text-rw-muted">Licenze assegnate</p>
              </div>
              <p className="mt-2 font-display text-3xl font-semibold text-amber-400">
                {dealerPartners.reduce((sum, p) => sum + (p._count?.licenses ?? 0), 0)}
              </p>
            </article>
          </div>

          <Card title="Partner / Dealer" description="Gestisci i partner commerciali e i loro account di accesso.">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCreateDealer(!showCreateDealer)}
                className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-rw-accent/85"
              >
                <UserPlus className="h-4 w-4" /> Nuovo dealer
              </button>
              <button
                type="button"
                onClick={() => void refreshDealers()}
                disabled={dealerLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surface px-4 py-2.5 text-sm font-semibold text-rw-ink hover:bg-rw-surfaceAlt disabled:opacity-50"
              >
                <RefreshCcw className={`h-4 w-4 ${dealerLoading ? "animate-spin" : ""}`} /> Aggiorna
              </button>
            </div>

            {showCreateDealer && (
              <div className="mb-4 rounded-xl border border-rw-accent/20 bg-rw-surfaceAlt p-4 space-y-3">
                <p className="text-sm font-bold text-rw-ink">Crea nuovo account dealer</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-rw-muted mb-1">Username</label>
                    <input
                      className="w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
                      placeholder="dealer.nomeparnter"
                      value={newDealer.username}
                      onChange={(e) => setNewDealer({ ...newDealer, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "") })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rw-muted mb-1">Nome completo</label>
                    <input
                      className="w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
                      placeholder="Mario Rossi"
                      value={newDealer.name}
                      onChange={(e) => setNewDealer({ ...newDealer, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rw-muted mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
                      placeholder="dealer@partner.com"
                      value={newDealer.email}
                      onChange={(e) => setNewDealer({ ...newDealer, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rw-muted mb-1">Password iniziale</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
                      placeholder="Min 6 caratteri"
                      value={newDealer.password}
                      onChange={(e) => setNewDealer({ ...newDealer, password: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-rw-muted mb-1">Codice partner (opzionale — collega a partner esistente)</label>
                    <select
                      className="w-full rounded-xl border border-rw-line bg-rw-surface px-3 py-2.5 text-sm text-rw-ink focus:border-rw-accent focus:outline-none"
                      value={newDealer.partnerCode}
                      onChange={(e) => setNewDealer({ ...newDealer, partnerCode: e.target.value })}
                    >
                      <option value="">Nessun partner</option>
                      {dealerPartners.map((p) => (
                        <option key={p.id} value={p.code}>{p.name} ({p.country}) — {p.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!newDealer.username || !newDealer.name || !newDealer.email || newDealer.password.length < 6}
                    onClick={() => void handleCreateDealer()}
                    className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-rw-accent/85 disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" /> Crea dealer
                  </button>
                  <button type="button" onClick={() => setShowCreateDealer(false)} className="text-xs text-rw-muted hover:text-rw-soft">Annulla</button>
                </div>
                <p className="text-xs text-rw-muted">Il dealer dovrà cambiare la password al primo accesso.</p>
              </div>
            )}

            <DataTable
              columns={[
                {
                  key: "username" as const,
                  header: "Username",
                  render: (u: AdminUser) => (
                    <div>
                      <p className="font-semibold text-rw-ink">{u.username}</p>
                      <p className="text-xs text-rw-muted">{u.email}</p>
                    </div>
                  ),
                },
                { key: "name" as const, header: "Nome" },
                {
                  key: "role" as const,
                  header: "Partner",
                  render: (u: AdminUser) => {
                    const partner = dealerPartners.find((p) => p.code === (u as AdminUser & { partnerCode?: string }).partnerCode);
                    return partner ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                        <Handshake className="h-3 w-3" /> {partner.name} ({partner.country})
                      </span>
                    ) : (
                      <span className="text-xs text-rw-muted">— non assegnato</span>
                    );
                  },
                },
                {
                  key: "mustChangePassword" as const,
                  header: "Stato",
                  render: (u: AdminUser) => (
                    <div className="flex flex-col gap-1">
                      {u.isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">
                          Bloccato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                          Attivo
                        </span>
                      )}
                      {u.mustChangePassword && (
                        <span className="text-[10px] text-amber-400">Cambio pw obbligatorio</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "id" as const,
                  header: "",
                  render: (u: AdminUser) => (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg bg-rw-accent/15 px-2 py-1 text-xs font-semibold text-rw-accent"
                        onClick={() =>
                          api.admin.users.generateTempPassword(u.id).then((result) => {
                            setDealerUsers((prev) => prev.map((d) => (d.id === result.user.id ? result.user : d)));
                            setDealerFlash(`Password provvisoria per ${result.user.username}: ${result.temporaryPassword}`);
                          })
                        }
                      >
                        <RefreshCcw className="h-3.5 w-3.5" /> Reset password
                      </button>
                      {u.isLocked && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400"
                          onClick={() =>
                            api.admin.users.unlock(u.id).then((result) => {
                              setDealerUsers((prev) => prev.map((d) => (d.id === result.user.id ? result.user : d)));
                            })
                          }
                        >
                          <UnlockKeyhole className="h-3.5 w-3.5" /> Sblocca
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={dealerUsers}
              keyExtractor={(u) => u.id}
              emptyMessage="Nessun dealer registrato. Clicca 'Nuovo dealer' per crearne uno."
            />
          </Card>

          {dealerPartners.length > 0 && (
            <Card title="Dettaglio Partner" description="Prezzi, commissioni e licenze per partner.">
              <div className="space-y-3">
                {dealerPartners.map((p) => (
                  <div key={p.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-accent/15 ring-1 ring-rw-accent/30">
                          <Handshake className="h-5 w-5 text-rw-accent" />
                        </div>
                        <div>
                          <p className="font-semibold text-rw-ink">{p.name}</p>
                          <p className="text-xs text-rw-muted">{p.country} — codice: <code className="rounded bg-rw-surface px-1 text-rw-accent">{p.code}</code></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${p.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
                          {p.active ? "Attivo" : "Disattivato"}
                        </span>
                        <button
                          type="button"
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${p.active ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}
                          onClick={async () => {
                            try {
                              await fetch("/api/reseller/partners", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: p.id, active: !p.active }),
                              });
                              void refreshDealers();
                            } catch { /* ignore */ }
                          }}
                        >
                          {p.active ? "Disattiva" : "Attiva"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4 text-xs">
                      <div className="rounded-lg bg-rw-surface p-2">
                        <p className="text-rw-muted">Prezzo licenza</p>
                        <p className="font-bold text-rw-ink">€{p.licensePrice}</p>
                      </div>
                      <div className="rounded-lg bg-rw-surface p-2">
                        <p className="text-rw-muted">Commissione</p>
                        <p className="font-bold text-rw-ink">€{p.commissionEuros}{p.commissionPct > 0 ? ` (${p.commissionPct}%)` : ""}</p>
                      </div>
                      <div className="rounded-lg bg-rw-surface p-2">
                        <p className="text-rw-muted">All Inclusive</p>
                        <p className="font-bold text-rw-ink">{p.allInclusivePrice ? `€${p.allInclusivePrice}` : "—"}</p>
                      </div>
                      <div className="rounded-lg bg-rw-surface p-2">
                        <p className="text-rw-muted">Licenze vendute</p>
                        <p className="font-bold text-rw-ink">{p._count?.licenses ?? 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "groups" && (
        <div className="space-y-4">
          <Card title="Gestione Gruppi Multi-locale" description="Crea gruppi di tenant per permettere agli owner di gestire più locali da un'unica dashboard.">
            {groupsError && (
              <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {groupsError}
              </div>
            )}
            <form
              className="mb-4 flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreateGroup();
              }}
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-rw-muted mb-1">Nome gruppo</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
                  placeholder="Es. Gruppo Rossi (Milano + Roma)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-rw-accent/90 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Crea gruppo
              </button>
            </form>

            {groupsLoading && (
              <p className="text-sm text-rw-muted">Caricamento gruppi…</p>
            )}

            {!groupsLoading && groups.length === 0 && (
              <p className="text-sm text-rw-muted">Nessun gruppo creato. Crea un gruppo per collegare più tenant allo stesso owner.</p>
            )}

            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-rw-accent" />
                      <h3 className="text-sm font-bold text-rw-ink">{g.name}</h3>
                      <span className="text-xs text-rw-muted">({g.members.length} tenant)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(g.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Elimina gruppo
                    </button>
                  </div>

                  {g.members.length > 0 && (
                    <div className="mb-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-rw-line text-left text-rw-muted">
                            <th className="pb-1 pr-3">Tenant</th>
                            <th className="pb-1 pr-3">Slug</th>
                            <th className="pb-1 pr-3">Piano</th>
                            <th className="pb-1 pr-3">Stato</th>
                            <th className="pb-1"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.members.map((m) => (
                            <tr key={m.id} className="border-b border-rw-line/30">
                              <td className="py-1.5 pr-3 font-semibold text-rw-ink">{m.tenantName}</td>
                              <td className="py-1.5 pr-3 text-rw-soft">{m.tenantSlug}</td>
                              <td className="py-1.5 pr-3 text-rw-soft">{m.tenantPlan}</td>
                              <td className="py-1.5 pr-3">
                                <span className={m.tenantStatus === "active" ? "text-emerald-400" : "text-amber-400"}>
                                  {m.tenantStatus}
                                </span>
                              </td>
                              <td className="py-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTenantFromGroup(g.id, m.tenantId)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  Rimuovi
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {addTenantToGroupId === g.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="flex-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink focus:border-rw-accent focus:outline-none"
                        value={addTenantValue}
                        onChange={(e) => setAddTenantValue(e.target.value)}
                      >
                        <option value="">Seleziona tenant…</option>
                        {tenants
                          .filter((t) => !g.members.some((m) => m.tenantId === t.id))
                          .map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.plan})</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!addTenantValue}
                        onClick={() => handleAddTenantToGroup(g.id)}
                        className="rounded-xl bg-rw-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rw-accent/90 disabled:opacity-60"
                      >
                        Aggiungi
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddTenantToGroupId(null); setAddTenantValue(""); }}
                        className="text-xs text-rw-muted hover:text-rw-soft"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddTenantToGroupId(g.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rw-accent hover:text-rw-accent/80"
                    >
                      <Plus className="h-3.5 w-3.5" /> Aggiungi tenant al gruppo
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
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
