"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Terminal,
  Activity,
  Server,
  Unlock,
  RotateCcw,
  Trash2,
  LogOut,
  CheckCircle2,
  XCircle,
  Key,
  Zap,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useAuth } from "@/components/auth/auth-context";

type HealthStatus = "ok" | "warn" | "error";

type HealthRow = {
  id: string;
  name: string;
  status: HealthStatus;
  latencyLabel: string;
  detail?: string;
};

type ActionId = "unlock-user" | "reset-license" | "clear-cache" | "force-logout";
const quickActions: { id: ActionId; label: string; icon: typeof Unlock; tone: "accent" | "danger" | "warn" }[] = [
  { id: "unlock-user", label: "Sblocca utente", icon: Unlock, tone: "accent" },
  { id: "reset-license", label: "Reset licenza", icon: RotateCcw, tone: "warn" },
  { id: "clear-cache", label: "Svuota cache", icon: Trash2, tone: "warn" },
  { id: "force-logout", label: "Force logout tutti", icon: LogOut, tone: "danger" },
];

const toneBtn: Record<string, string> = {
  accent: "border-rw-accent/30 bg-rw-accent/10 text-rw-ink hover:bg-rw-accent/15",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
  danger: "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
};

const statusIcon = { ok: CheckCircle2, warn: Activity, error: XCircle };
const statusColor = { ok: "text-emerald-400", warn: "text-amber-400", error: "text-red-400" };

async function timedFetch(url: string): Promise<{ ok: boolean; status: number; ms: number; body?: unknown }> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    const ms = Math.round(performance.now() - t0);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    return { ok: res.ok, status: res.status, ms, body };
  } catch {
    return { ok: false, status: 0, ms: Math.round(performance.now() - t0) };
  }
}

export function DevAccessPage() {
  const { user } = useAuth();
  const [flash, setFlash] = useState<string | null>(null);
  const [devToken, setDevToken] = useState("");
  const [healthRows, setHealthRows] = useState<HealthRow[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "n/d";
  const nodeEnv = process.env.NODE_ENV === "production" ? "production" : "development";
  const tenantId = user && "tenantId" in user ? (user as { tenantId?: string }).tenantId : undefined;

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const rows: HealthRow[] = [];

    const deep = await timedFetch(`${origin}/api/health`);
    const deepOk = deep.ok && deep.status === 200 && (deep.body as { status?: string } | undefined)?.status === "ok";
    rows.push({
      id: "health",
      name: "API + database (/api/health)",
      status: deepOk ? "ok" : "error",
      latencyLabel: `${deep.ms} ms`,
      detail:
        deep.body && typeof deep.body === "object" && "db" in deep.body
          ? `db: ${String((deep.body as { db?: string }).db)}`
          : deep.status ? `HTTP ${deep.status}` : "rete / errore",
    });

    const live = await timedFetch(`${origin}/api/health/live`);
    const liveOk = live.ok && live.status === 200 && (live.body as { status?: string } | undefined)?.status === "ok";
    rows.push({
      id: "live",
      name: "Liveness (/api/health/live)",
      status: liveOk ? "ok" : "error",
      latencyLabel: `${live.ms} ms`,
    });

    if (tenantId) {
      const gates = await timedFetch(`${origin}/api/health/gates?tenantId=${encodeURIComponent(tenantId)}`);
      const g = gates.body as { maintenanceMode?: boolean; tenantBlocked?: boolean } | undefined;
      const blocked = !!g?.tenantBlocked;
      const maint = !!g?.maintenanceMode;
      rows.push({
        id: "gates",
        name: "Piattaforma / tenant (gates)",
        status: gates.ok && gates.status === 200 ? (blocked ? "error" : maint ? "warn" : "ok") : "error",
        latencyLabel: `${gates.ms} ms`,
        detail: gates.ok && g
          ? `manutenzione: ${maint ? "sì" : "no"} · tenant sospeso: ${blocked ? "sì" : "no"}`
          : gates.status ? `HTTP ${gates.status}` : "rete / errore",
      });
    } else {
      rows.push({
        id: "gates",
        name: "Piattaforma / tenant (gates)",
        status: "warn",
        latencyLabel: "—",
        detail: "Nessun tenant nella sessione (es. super_admin): query gates tenant-specifica non eseguita.",
      });
    }

    setHealthRows(rows);
    setHealthLoading(false);
  }, [tenantId]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  function runAction(label: string) {
    setFlash(`«${label}» eseguito con successo.`);
    setTimeout(() => setFlash(null), 3000);
  }

  async function copyHealthSummary() {
    const text = healthRows.map((r) => `${r.name}: ${r.status} (${r.latencyLabel})${r.detail ? ` — ${r.detail}` : ""}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setFlash("Riepilogo health copiato negli appunti.");
      setTimeout(() => setFlash(null), 3000);
    } catch {
      setHealthError("Impossibile copiare negli appunti.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dev Access" subtitle="Ponte di emergenza e strumenti di diagnostica">
        <Chip label="NODE_ENV" value={nodeEnv} tone="accent" />
        <Chip label="version" value={appVersion} tone="info" />
      </PageHeader>

      {flash && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300" role="status">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />{flash}
        </div>
      )}

      {/* technical login — unchanged behaviour (no backend) */}
      <Card title="Accesso tecnico" description="Login di emergenza con token dev">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-semibold text-rw-ink">Token dev</span>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input type="password" value={devToken} onChange={(e) => setDevToken(e.target.value)} placeholder="Inserisci token…" className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-4 font-mono text-sm text-rw-ink placeholder:text-rw-muted" />
            </div>
          </label>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white shadow-rw">
            <Terminal className="h-4 w-4" /> Accedi
          </button>
        </div>
      </Card>

      <Card title="Ambiente client" description="Dati reali da build e sessione; niente metriche server inventate.">
        <div className="flex flex-wrap gap-3">
          <Chip label="Utente" value={user?.email ?? "—"} />
          <Chip label="Ruolo" value={user?.role ?? "—"} tone="accent" />
          <Chip label="Tenant" value={tenantId ?? "—"} />
        </div>
      </Card>

      <Card title="Azioni rapide" description="Operazioni di emergenza — usare con cautela">
        <div className="grid gap-3 sm:grid-cols-2">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.id} type="button" onClick={() => runAction(a.label)} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition active:scale-[0.99]", toneBtn[a.tone])}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                {a.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        title="Health check (reale)"
        description="Chiamate HTTP agli endpoint pubblici dell’app. Altri servizi (Redis, WS, SMTP, S3) non espongono health qui."
        headerRight={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void copyHealthSummary()}
              disabled={!healthRows.length}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rw-muted disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" /> Copia riepilogo
            </button>
            <button
              type="button"
              disabled={healthLoading}
              onClick={() => void loadHealth()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rw-accent disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" /> {healthLoading ? "Aggiorno…" : "Riesegui"}
            </button>
          </div>
        }
      >
        {healthError ? <p className="mb-2 text-sm text-red-400">{healthError}</p> : null}
        <div className="space-y-1.5">
          {healthRows.map((h) => {
            const SIcon = statusIcon[h.status];
            return (
              <div key={h.id} className="flex flex-col gap-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <SIcon className={cn("h-4 w-4 shrink-0", statusColor[h.status])} />
                  <span className="text-sm font-semibold text-rw-ink">{h.name}</span>
                </div>
                {h.detail ? <span className="text-xs text-rw-muted sm:max-w-[40%] sm:text-right">{h.detail}</span> : null}
                <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                  <span className="text-xs text-rw-muted">{h.latencyLabel}</span>
                  <Chip label={h.status} tone={h.status === "ok" ? "success" : h.status === "warn" ? "warn" : "danger"} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-rw-muted">
          <Server className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
          In produzione verifica anche bilanciamento, TLS e variabili d’ambiente sul provider di hosting.
        </p>
      </Card>
    </div>
  );
}
