"use client";

import { useEffect, useState } from "react";
import {
  BadgeEuro,
  CheckCircle2,
  Clock,
  Globe,
  RefreshCcw,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";

type LicenseRow = {
  tenantId: string;
  tenantName: string;
  plan: string;
  billingCycle: string;
  status: "trial" | "active" | "expired" | "suspended";
  activatedAt: string;
  expiresAt: string;
  licensePrice: number | null;
  commissionEuros: number | null;
  partnerCountry: string | null;
};

type Partner = {
  code: string;
  name: string;
  country: string;
  licensePrice: number;
  commissionEuros: number;
  allInclusivePrice: number | null;
  allInclusiveCommission: number | null;
};

type Summary = {
  total: number;
  active: number;
  expired: number;
  totalCommissionEuros: number;
};

type DashboardData = {
  partner: Partner | null;
  licenses: LicenseRow[];
  summary: Summary;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Attiva",
  trial: "Trial",
  expired: "Scaduta",
  suspended: "Sospesa",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  trial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  suspended: "bg-red-500/15 text-red-400 border-red-500/30",
};

const PLAN_LABEL: Record<string, string> = {
  restaurant_only: "Ristorante",
  hotel_only: "Hotel",
  all_included: "All Inclusive",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function euro(n: number | null) {
  if (n === null) return "—";
  return `€ ${n.toFixed(2).replace(".", ",")}`;
}

export function ControlloVenditePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reseller/dashboard", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Errore ${res.status}`);
      }
      const json = await res.json() as { data: DashboardData };
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="min-h-screen bg-rw-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-rw-ink">
              Controllo Vendite
            </h1>
            {data?.partner && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-rw-muted">
                <Globe className="h-4 w-4" />
                {data.partner.name} — {data.partner.country}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surface px-4 py-2 text-sm font-semibold text-rw-ink hover:bg-rw-surfaceAlt disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Clienti totali"
              value={String(data.summary.total)}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              label="Licenze attive"
              value={String(data.summary.active)}
              accent="emerald"
            />
            <StatCard
              icon={<Clock className="h-5 w-5 text-red-400" />}
              label="Scadute / Sospese"
              value={String(data.summary.expired)}
              accent="red"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-rw-accent" />}
              label="Commissioni attive"
              value={euro(data.summary.totalCommissionEuros)}
              accent="accent"
            />
          </div>
        )}

        {/* Pricing info */}
        {data?.partner && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Restaurant Only tier */}
              <div className="rounded-xl border border-rw-line bg-rw-surface p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rw-muted">Solo Ristorante</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <BadgeEuro className="h-4 w-4 text-rw-muted" />
                    <span className="text-rw-muted">Prezzo:</span>
                    <span className="font-semibold text-rw-ink">{euro(data.partner.licensePrice)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BadgeEuro className="h-4 w-4 text-emerald-400" />
                    <span className="text-rw-muted">Commissione:</span>
                    <span className="font-semibold text-emerald-400">{euro(data.partner.commissionEuros)}</span>
                  </div>
                </div>
              </div>

              {/* All Inclusive tier */}
              {data.partner.allInclusivePrice != null && (
                <div className="rounded-xl border border-rw-accent/30 bg-rw-accent/5 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rw-accent">All Inclusive</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <BadgeEuro className="h-4 w-4 text-rw-muted" />
                      <span className="text-rw-muted">Prezzo:</span>
                      <span className="font-semibold text-rw-ink">{euro(data.partner.allInclusivePrice)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BadgeEuro className="h-4 w-4 text-emerald-400" />
                      <span className="text-rw-muted">Commissione:</span>
                      <span className="font-semibold text-emerald-400">{euro(data.partner.allInclusiveCommission)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-rw-line bg-rw-surface">
          <div className="border-b border-rw-line px-5 py-4">
            <h2 className="font-semibold text-rw-ink">Lista clienti</h2>
            <p className="mt-0.5 text-xs text-rw-muted">
              Ogni riga è un cliente attivato con la tua licenza partner.
            </p>
          </div>

          {loading && !data ? (
            <div className="flex items-center justify-center py-16 text-rw-muted text-sm">
              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              Caricamento…
            </div>
          ) : data?.licenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-rw-muted">
              <Users className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nessun cliente ancora registrato.</p>
              <p className="text-xs">Le licenze attivate con il tuo codice partner appariranno qui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Piano</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Attivazione</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Scadenza</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Prezzo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Commissione</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-rw-muted">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rw-line">
                  {data?.licenses.map((row) => (
                    <tr key={row.tenantId} className="hover:bg-rw-surfaceAlt/40 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-rw-ink">{row.tenantName}</td>
                      <td className="px-4 py-3.5 text-rw-soft">{PLAN_LABEL[row.plan] ?? row.plan}</td>
                      <td className="px-4 py-3.5 tabular-nums text-rw-soft">{fmt(row.activatedAt)}</td>
                      <td className="px-4 py-3.5 tabular-nums text-rw-soft">{fmt(row.expiresAt)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-rw-ink">{euro(row.licensePrice)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-emerald-400">
                        {row.status === "active" ? euro(row.commissionEuros) : <span className="text-rw-muted font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[row.status] ?? ""}`}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                {data && data.licenses.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-rw-line bg-rw-surfaceAlt/60 font-semibold">
                      <td className="px-5 py-3 text-rw-ink" colSpan={5}>
                        Totale commissioni licenze attive
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-400">
                        {euro(data.summary.totalCommissionEuros)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "emerald" | "red" | "accent";
}) {
  const valueStyle =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "red"
        ? "text-red-400"
        : accent === "accent"
          ? "text-rw-accent"
          : "text-rw-ink";

  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
      <div className="flex items-center gap-2 text-rw-muted">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${valueStyle}`}>{value}</p>
    </div>
  );
}
