"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  Key,
  Loader2,
  LogOut,
  Monitor,
  RefreshCcw,
  Shield,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useAuth } from "@/components/auth/auth-context";
import { sessionsApi, type UserSessionRecord } from "@/lib/api-client";

function detectDevice(userAgent: string | null): "desktop" | "mobile" | "tablet" {
  if (!userAgent) return "desktop";
  const ua = userAgent.toLowerCase();
  if (/iphone|ipod|android.*mobile|windows phone/.test(ua)) return "mobile";
  if (/ipad|tablet|playbook|kindle/.test(ua)) return "tablet";
  return "desktop";
}

function detectBrowser(userAgent: string | null): string {
  if (!userAgent) return "Browser";
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) return "Chrome";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) return "Safari";
  if (/Chromium/.test(userAgent)) return "Chromium";
  return "Browser";
}

function formatDuration(issuedIso: string): string {
  const diff = Date.now() - new Date(issuedIso).getTime();
  if (diff < 0) return "ora";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "adesso";
  if (min < 60) return `${min}m fa`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  if (h < 24) return rest > 0 ? `${h}h ${rest}m fa` : `${h}h fa`;
  const d = Math.floor(h / 24);
  return `${d}g fa`;
}

const deviceIcon = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

export function SessionsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [selfJti, setSelfJti] = useState<string | null>(null);
  const [scope, setScope] = useState<"self" | "tenant">("self");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionsApi.list({
        scope: isSuperAdmin ? scope : "self",
        active: true,
      });
      setSessions(data.sessions);
      setSelfJti(data.self);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento sessioni");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const accessSessions = useMemo(
    () => sessions.filter((row) => row.tokenType === "access"),
    [sessions],
  );

  async function handleRevoke(sessionId: string) {
    setBusy(sessionId);
    setError(null);
    try {
      await sessionsApi.revoke(sessionId);
      setSessions((prev) => prev.filter((row) => row.id !== sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoca fallita");
    } finally {
      setBusy(null);
    }
  }

  const stats = useMemo(() => {
    const byDevice = accessSessions.reduce(
      (acc, row) => {
        const kind = detectDevice(row.userAgent);
        acc[kind] += 1;
        return acc;
      },
      { desktop: 0, mobile: 0, tablet: 0 },
    );
    return { total: accessSessions.length, ...byDevice };
  }, [accessSessions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessioni attive"
        subtitle={
          isSuperAdmin
            ? scope === "tenant"
              ? "Tutte le sessioni attive del tenant"
              : "Le mie sessioni attive"
            : "Le tue sessioni attive"
        }
      >
        {isSuperAdmin ? (
          <div className="inline-flex items-center gap-1 rounded-xl border border-rw-line bg-rw-surfaceAlt p-1">
            <button
              type="button"
              onClick={() => setScope("self")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                scope === "self" ? "bg-rw-accent/15 text-rw-accent" : "text-rw-muted hover:text-rw-soft",
              )}
            >
              Le mie
            </button>
            <button
              type="button"
              onClick={() => setScope("tenant")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                scope === "tenant" ? "bg-rw-accent/15 text-rw-accent" : "text-rw-muted hover:text-rw-soft",
              )}
            >
              Tenant
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink hover:border-rw-accent/30 hover:text-rw-accent"
        >
          <RefreshCcw className="h-4 w-4" /> Aggiorna
        </button>
      </PageHeader>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Totali", value: stats.total, icon: Users, tone: "text-rw-accent" },
          { label: "Desktop", value: stats.desktop, icon: Monitor, tone: "text-blue-400" },
          { label: "Mobile", value: stats.mobile, icon: Smartphone, tone: "text-emerald-400" },
          { label: "Tablet", value: stats.tablet, icon: Tablet, tone: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-rw-line bg-rw-surface p-4">
            <div className="flex items-center gap-2 text-rw-muted">
              <s.icon className={cn("h-4 w-4", s.tone)} />
              <span className="text-xs font-semibold uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-rw-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <Card title="Elenco sessioni" description="Access token attivi — la revoca chiude la sessione immediatamente (il token non verra' piu accettato al prossimo refresh o verifica).">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-rw-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento sessioni…
          </div>
        ) : accessSessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-rw-muted">Nessuna sessione attiva.</p>
        ) : (
          <div className="space-y-2">
            {accessSessions.map((session) => {
              const device = detectDevice(session.userAgent);
              const browser = detectBrowser(session.userAgent);
              const isCurrent = !!selfJti && session.jti === selfJti;
              const DevIcon = deviceIcon[device];
              return (
                <div
                  key={session.id}
                  className={cn(
                    "flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3 transition",
                    isCurrent
                      ? "border-rw-accent/30 bg-rw-accent/5"
                      : "border-rw-line bg-rw-surfaceAlt",
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surfaceAlt text-rw-accent">
                    <DevIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-rw-ink">
                      <span>{browser}</span>
                      <span className="text-rw-muted">·</span>
                      <span className="text-xs font-normal text-rw-muted">{session.ipAddress ?? "IP sconosciuto"}</span>
                      {isCurrent ? <Chip label="corrente" tone="accent" /> : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-rw-muted">
                      {session.userAgent ?? "User agent non disponibile"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-rw-muted">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Avviata {formatDuration(session.issuedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-rw-muted">
                    <Shield className="h-3.5 w-3.5" />
                    <Key className="h-3.5 w-3.5" />
                    <span className="font-mono">…{session.jti.slice(-8)}</span>
                  </div>
                  {isCurrent ? (
                    <span className="text-xs font-semibold text-rw-muted">Sessione corrente</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === session.id}
                      onClick={() => void handleRevoke(session.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {busy === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                      Revoca
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
