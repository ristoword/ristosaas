"use client";

import { useState } from "react";
import {
  Terminal,
  Activity,
  Server,
  Shield,
  Unlock,
  RotateCcw,
  Trash2,
  LogOut,
  CheckCircle2,
  XCircle,
  Cpu,
  HardDrive,
  Clock,
  Key,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";

/** preview/mock page: operational diagnostics panel */

const diagnostics = {
  version: "2.4.1-beta",
  env: "production",
  uptime: "14d 7h 23m",
  memoryUsed: 412,
  memoryTotal: 1024,
  cpuPercent: 23,
  nodeVersion: "20.12.2",
  dbLatency: "4ms",
  tenantId: "tenant_ristodemo_01",
  tenantPlan: "Pro",
  tenantUsers: 8,
};

const healthChecks = [
  { id: "h1", name: "API Gateway", status: "ok" as const, latency: "12ms" },
  { id: "h2", name: "Database PostgreSQL", status: "ok" as const, latency: "4ms" },
  { id: "h3", name: "Redis cache", status: "ok" as const, latency: "1ms" },
  { id: "h4", name: "WebSocket server", status: "ok" as const, latency: "3ms" },
  { id: "h5", name: "Stripe webhook", status: "ok" as const, latency: "180ms" },
  { id: "h6", name: "SMTP service", status: "warn" as const, latency: "420ms" },
  { id: "h7", name: "Storage S3", status: "ok" as const, latency: "45ms" },
  { id: "h8", name: "Background jobs", status: "error" as const, latency: "—" },
];

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

export function DevAccessPage() {
  const [flash, setFlash] = useState<string | null>(null);
  const [devToken, setDevToken] = useState("");

  function runAction(label: string) {
    setFlash(`«${label}» eseguito con successo.`);
    setTimeout(() => setFlash(null), 3000);
  }

  const memPct = Math.round((diagnostics.memoryUsed / diagnostics.memoryTotal) * 100);

  return (
    <div className="space-y-6">
      <PageHeader title="Dev Access" subtitle="Ponte di emergenza e strumenti di diagnostica">
        <Chip label="ENV" value={diagnostics.env} tone="accent" />
        <Chip label="v" value={diagnostics.version} tone="info" />
      </PageHeader>

      {flash && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300" role="status">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />{flash}
        </div>
      )}

      {/* technical login */}
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

      {/* system diagnostics */}
      <Card title="Diagnostica sistema">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rw-muted"><Clock className="h-3.5 w-3.5" />Uptime</div>
            <p className="mt-1 font-display text-lg font-bold text-rw-ink">{diagnostics.uptime}</p>
          </div>
          <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rw-muted"><HardDrive className="h-3.5 w-3.5" />Memoria</div>
            <p className="mt-1 font-display text-lg font-bold text-rw-ink">{diagnostics.memoryUsed}MB / {diagnostics.memoryTotal}MB</p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-rw-line">
              <div className={cn("h-full rounded-full", memPct > 80 ? "bg-red-500" : "bg-emerald-500")} style={{ width: `${memPct}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rw-muted"><Cpu className="h-3.5 w-3.5" />CPU</div>
            <p className="mt-1 font-display text-lg font-bold text-rw-ink">{diagnostics.cpuPercent}%</p>
          </div>
          <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rw-muted"><Server className="h-3.5 w-3.5" />Node / DB</div>
            <p className="mt-1 text-sm font-semibold text-rw-ink">v{diagnostics.nodeVersion}</p>
            <p className="text-xs text-rw-muted">DB latency: {diagnostics.dbLatency}</p>
          </div>
        </div>
      </Card>

      {/* tenant info */}
      <Card title="Info tenant">
        <div className="flex flex-wrap gap-3">
          <Chip label="ID" value={diagnostics.tenantId} />
          <Chip label="Piano" value={diagnostics.tenantPlan} tone="accent" />
          <Chip label="Utenti" value={diagnostics.tenantUsers} tone="info" />
        </div>
      </Card>

      {/* quick actions */}
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

      {/* health checks */}
      <Card title="API Health check" headerRight={
        <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-rw-accent">
          <Zap className="h-3.5 w-3.5" /> Riesegui
        </button>
      }>
        <div className="space-y-1.5">
          {healthChecks.map((h) => {
            const SIcon = statusIcon[h.status];
            return (
              <div key={h.id} className="flex items-center gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5">
                <SIcon className={cn("h-4 w-4 shrink-0", statusColor[h.status])} />
                <span className="flex-1 text-sm font-semibold text-rw-ink">{h.name}</span>
                <span className="text-xs text-rw-muted">{h.latency}</span>
                <Chip label={h.status} tone={h.status === "ok" ? "success" : h.status === "warn" ? "warn" : "danger"} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
