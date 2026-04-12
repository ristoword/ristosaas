"use client";

import { useState } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  LogOut,
  Trash2,
  Users,
  Clock,
  Shield,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";

type Session = {
  id: string;
  user: string;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  ip: string;
  startedAt: string;
  durationMin: number;
  current: boolean;
};

const deviceIcon = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

const mockSessions: Session[] = [
  { id: "s1", user: "admin@ristodemo.it", device: "desktop", browser: "Chrome 124", ip: "192.168.1.10", startedAt: "2026-04-11 08:15", durationMin: 247, current: true },
  { id: "s2", user: "marco.r@ristodemo.it", device: "tablet", browser: "Safari 18", ip: "192.168.1.22", startedAt: "2026-04-11 11:30", durationMin: 52, current: false },
  { id: "s3", user: "sara.l@ristodemo.it", device: "mobile", browser: "Chrome 124", ip: "10.0.0.45", startedAt: "2026-04-11 12:00", durationMin: 22, current: false },
  { id: "s4", user: "luca.b@ristodemo.it", device: "desktop", browser: "Firefox 128", ip: "192.168.1.15", startedAt: "2026-04-11 09:45", durationMin: 157, current: false },
  { id: "s5", user: "anna.p@ristodemo.it", device: "tablet", browser: "Safari 18", ip: "192.168.1.33", startedAt: "2026-04-11 10:20", durationMin: 122, current: false },
  { id: "s6", user: "dev@ristodemo.it", device: "desktop", browser: "Chrome 124", ip: "88.34.12.99", startedAt: "2026-04-10 22:10", durationMin: 620, current: false },
];

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function SessionsPage() {
  const [sessions, setSessions] = useState(mockSessions);

  function kick(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function bulkLogout() {
    setSessions((prev) => prev.filter((s) => s.current));
  }

  const stats = {
    total: sessions.length,
    desktop: sessions.filter((s) => s.device === "desktop").length,
    mobile: sessions.filter((s) => s.device === "mobile").length,
    tablet: sessions.filter((s) => s.device === "tablet").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sessioni attive" subtitle="Gestisci le connessioni al sistema">
        <button
          type="button"
          onClick={bulkLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400"
        >
          <Trash2 className="h-4 w-4" /> Disconnetti tutte
        </button>
      </PageHeader>

      {/* stats */}
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

      {/* session list */}
      <Card title="Elenco sessioni">
        <div className="space-y-2">
          {sessions.length === 0 && (
            <p className="py-6 text-center text-sm text-rw-muted">Nessuna sessione attiva.</p>
          )}
          {sessions.map((s) => {
            const DevIcon = deviceIcon[s.device];
            return (
              <div
                key={s.id}
                className={cn(
                  "flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3 transition",
                  s.current
                    ? "border-rw-accent/30 bg-rw-accent/5"
                    : "border-rw-line bg-rw-surfaceAlt",
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surfaceAlt text-rw-accent">
                  <DevIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-rw-ink">
                    {s.user}
                    {s.current && <Chip label="corrente" tone="accent" className="ml-2" />}
                  </p>
                  <p className="text-xs text-rw-muted">{s.browser} · {s.ip}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-rw-muted">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{s.startedAt}</span>
                  <span className="font-semibold text-rw-soft">{fmtDuration(s.durationMin)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-rw-muted">
                  <Wifi className="h-3.5 w-3.5" />
                  <Shield className="h-3.5 w-3.5" />
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => kick(s.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Disconnetti
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
