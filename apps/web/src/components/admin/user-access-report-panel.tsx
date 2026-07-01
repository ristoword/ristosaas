"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  LogIn,
  RefreshCcw,
  Search,
  UnlockKeyhole,
  UserCheck,
  UserX,
  Wifi,
} from "lucide-react";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { api, type UserAccessReport } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type FilterId = "all" | "logged" | "never" | "online";

type Props = {
  mode: "operational" | "readonly";
  apiPath: "/admin/user-access" | "/partner/user-access";
  title?: string;
  description?: string;
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserAccessReportPanel({ mode, apiPath, title, description }: Props) {
  const [report, setReport] = useState<UserAccessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");
  const [actionFlash, setActionFlash] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api${apiPath}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    return report.users.filter((u) => {
      if (filter === "logged" && !u.hasLoggedIn) return false;
      if (filter === "never" && u.hasLoggedIn) return false;
      if (filter === "online" && !u.isOnline) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.tenantName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [report, filter, search]);

  async function runAction(userId: string, action: "unlock" | "tempPassword" | "forceChange") {
    if (mode !== "operational") return;
    setBusyUserId(userId);
    setActionFlash("");
    try {
      if (action === "unlock") {
        await api.admin.users.unlock(userId);
        setActionFlash("Account sbloccato.");
      } else if (action === "tempPassword") {
        const result = await api.admin.users.generateTempPassword(userId);
        setActionFlash(`Password provvisoria per ${result.user.username}: ${result.temporaryPassword}`);
      } else {
        await api.admin.users.forceChangePassword(userId);
        setActionFlash("Cambio password obbligatorio impostato.");
      }
      await load();
    } catch (e) {
      setActionFlash(e instanceof Error ? e.message : "Operazione non riuscita");
    } finally {
      setBusyUserId(null);
    }
  }

  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: "Tutti" },
    { id: "logged", label: "Hanno accesso" },
    { id: "never", label: "Mai entrati" },
    { id: "online", label: "Online ora" },
  ];

  return (
    <Card
      title={title ?? "Accessi utenti piattaforma"}
      description={
        description ??
        (mode === "operational"
          ? "Chi ha effettuato login, chi non ha mai accesso, utenti online e azioni di recovery."
          : "Panoramica accessi in sola lettura — nessuna modifica consentita.")
      }
      headerRight={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rw-line px-3 py-1.5 text-xs font-semibold text-rw-ink hover:bg-rw-surfaceAlt disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          Aggiorna
        </button>
      }
    >
      {error ? (
        <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {actionFlash ? (
        <p className="mb-4 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-3 text-sm text-rw-ink">
          {actionFlash}
        </p>
      ) : null}

      {report && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip label="Utenti totali" value={report.summary.total} tone="accent" />
          <Chip label="Hanno accesso" value={report.summary.loggedIn} tone="success" />
          <Chip label="Mai entrati" value={report.summary.neverLoggedIn} tone="warn" />
          <Chip label="Online ora" value={report.summary.onlineNow} tone="info" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              filter === f.id
                ? "border-rw-accent bg-rw-accent/15 text-rw-accent"
                : "border-rw-line text-rw-soft hover:text-rw-ink",
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca tenant, utente, email…"
            className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2 pl-9 pr-3 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
          />
        </div>
      </div>

      {loading && !report ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: "tenant",
              header: "Tenant",
              render: (u) => (
                <div>
                  <p className="font-medium text-rw-ink">{u.tenantName}</p>
                  <p className="text-xs text-rw-muted">{u.tenantSlug}</p>
                </div>
              ),
            },
            { key: "username", header: "Username", render: (u) => <span className="font-mono text-xs">{u.username}</span> },
            { key: "name", header: "Nome" },
            { key: "role", header: "Ruolo" },
            {
              key: "status",
              header: "Stato accesso",
              render: (u) =>
                u.isOnline ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    <Wifi className="h-3 w-3" /> Online
                  </span>
                ) : u.hasLoggedIn ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-300">
                    <UserCheck className="h-3 w-3" /> Ha accesso
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                    <UserX className="h-3 w-3" /> Mai entrato
                  </span>
                ),
            },
            {
              key: "lastLoginAt",
              header: "Ultimo login",
              render: (u) => <span className="text-sm text-rw-soft">{formatWhen(u.lastLoginAt)}</span>,
            },
            {
              key: "createdAt",
              header: "Creato il",
              render: (u) => <span className="text-sm text-rw-muted">{formatWhen(u.createdAt)}</span>,
            },
            {
              key: "account",
              header: "Account",
              render: (u) => (
                <div className="text-xs text-rw-soft">
                  {u.isLocked ? <span className="text-red-400">Bloccato</span> : <span className="text-emerald-400">Attivo</span>}
                  {u.mustChangePassword ? <span className="ml-2 text-amber-400">· Cambio pwd</span> : null}
                </div>
              ),
            },
            ...(mode === "operational"
              ? [
                  {
                    key: "actions",
                    header: "",
                    render: (u: (typeof filtered)[number]) => (
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          disabled={busyUserId === u.id}
                          onClick={() => void runAction(u.id, "unlock")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400 disabled:opacity-50"
                          title="Sblocca account"
                        >
                          <UnlockKeyhole className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busyUserId === u.id}
                          onClick={() => void runAction(u.id, "tempPassword")}
                          className="inline-flex items-center gap-1 rounded-lg bg-rw-accent/15 px-2 py-1 text-xs font-semibold text-rw-accent disabled:opacity-50"
                          title="Password provvisoria"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busyUserId === u.id}
                          onClick={() => void runAction(u.id, "forceChange")}
                          className="inline-flex items-center gap-1 rounded-lg border border-rw-line px-2 py-1 text-xs font-semibold text-rw-ink disabled:opacity-50"
                          title="Forza cambio password"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          data={filtered}
          keyExtractor={(u) => u.id}
          emptyMessage="Nessun utente corrisponde ai filtri."
        />
      )}

      {report ? (
        <p className="mt-3 text-xs text-rw-muted">
          Aggiornato: {formatWhen(report.generatedAt)} · Online = attività negli ultimi {report.summary.thresholdMinutes} min
        </p>
      ) : null}
    </Card>
  );
}
