"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BadgeEuro,
  CheckCircle2,
  Clock,
  Edit2,
  Globe,
  Percent,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Users,
  X,
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
  partnerCode: string | null;
  partnerName: string | null;
  partnerCountry: string | null;
};

type Partner = {
  id: string;
  code: string;
  name: string;
  country: string;
  email: string;
  phone: string;
  notes: string;
  commissionType: "fixed" | "percent";
  licensePrice: number;
  commissionEuros: number;
  commissionPct: number;
  allInclusivePrice: number | null;
  allInclusiveCommission: number | null;
  allInclusivePct: number | null;
  active: boolean;
  _count?: { licenses: number };
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

const STATUS_LABEL: Record<string, string> = { active: "Attiva", trial: "Trial", expired: "Scaduta", suspended: "Sospesa" };
const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  trial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  suspended: "bg-red-500/15 text-red-400 border-red-500/30",
};
const PLAN_LABEL: Record<string, string> = { restaurant_only: "Ristorante", hotel_only: "Hotel", all_included: "All Inclusive" };

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}
function euro(n: number | null) {
  if (n === null) return "—";
  return `€ ${n.toFixed(2).replace(".", ",")}`;
}

export function ControlloVenditePage() {
  const [tab, setTab] = useState<"dashboard" | "partners">("dashboard");
  const [data, setData] = useState<DashboardData | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [filterPartner, setFilterPartner] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);

  const loadDashboard = useCallback(async (partnerCode?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = partnerCode ? `?partnerCode=${encodeURIComponent(partnerCode)}` : "";
      const res = await fetch(`/api/reseller/dashboard${qs}`, { cache: "no-store" });
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
  }, []);

  const loadPartners = useCallback(async () => {
    try {
      const res = await fetch("/api/reseller/partners", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json() as { data: Partner[] };
        setPartners(json.data);
        setIsSuperAdmin(true);
      }
    } catch { /* reseller role — no access, ignore */ }
  }, []);

  useEffect(() => {
    void loadDashboard();
    void loadPartners();
  }, [loadDashboard, loadPartners]);

  const handleFilterChange = (code: string) => {
    setFilterPartner(code);
    void loadDashboard(code || undefined);
  };

  const handleDeletePartner = async (p: Partner) => {
    if (!confirm(`Eliminare il dealer "${p.name}" (${p.country})?`)) return;
    const res = await fetch(`/api/reseller/partners?id=${p.id}`, { method: "DELETE" });
    if (res.ok) {
      void loadPartners();
      void loadDashboard(filterPartner || undefined);
    }
  };

  const handleSavePartner = async (formData: Partial<Partner>) => {
    const method = editPartner ? "PUT" : "POST";
    const payload = editPartner ? { id: editPartner.id, ...formData } : formData;

    const res = await fetch("/api/reseller/partners", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      alert(body.error || "Errore salvataggio");
      return;
    }

    setModalOpen(false);
    setEditPartner(null);
    void loadPartners();
    void loadDashboard(filterPartner || undefined);
  };

  const TABS = [
    { key: "dashboard" as const, label: "Dashboard Vendite" },
    ...(isSuperAdmin ? [{ key: "partners" as const, label: "Gestione Dealer" }] : []),
  ];

  return (
    <div className="min-h-screen bg-rw-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-rw-ink">Controllo Vendite</h1>
            {data?.partner && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-rw-muted">
                <Globe className="h-4 w-4" />
                {data.partner.name} — {data.partner.country}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && tab === "partners" && (
              <button
                type="button"
                onClick={() => { setEditPartner(null); setModalOpen(true); }}
                className="flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rw-accent/85 transition"
              >
                <Plus className="h-4 w-4" /> Nuovo Dealer
              </button>
            )}
            <button
              type="button"
              onClick={() => { void loadDashboard(filterPartner || undefined); void loadPartners(); }}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surface px-4 py-2 text-sm font-semibold text-rw-ink hover:bg-rw-surfaceAlt disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
          </div>
        </div>

        {/* Tabs */}
        {TABS.length > 1 && (
          <div className="flex gap-1 rounded-xl bg-rw-surfaceAlt p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === t.key ? "bg-rw-surface text-rw-ink shadow-sm" : "text-rw-muted hover:text-rw-ink"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <ShieldAlert className="h-5 w-5 shrink-0" /> {error}
          </div>
        )}

        {tab === "dashboard" && (
          <>
            {/* Partner filter for super_admin */}
            {isSuperAdmin && partners.length > 0 && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-rw-muted font-medium">Filtra dealer:</label>
                <select
                  value={filterPartner}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm text-rw-ink"
                >
                  <option value="">Tutti i dealer</option>
                  {partners.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.country})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Stats */}
            {data && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard icon={<Users className="h-5 w-5" />} label="Clienti totali" value={String(data.summary.total)} />
                <StatCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} label="Licenze attive" value={String(data.summary.active)} accent="emerald" />
                <StatCard icon={<Clock className="h-5 w-5 text-red-400" />} label="Scadute / Sospese" value={String(data.summary.expired)} accent="red" />
                <StatCard icon={<TrendingUp className="h-5 w-5 text-rw-accent" />} label="Commissioni attive" value={euro(data.summary.totalCommissionEuros)} accent="accent" />
              </div>
            )}

            {/* Pricing info */}
            {data?.partner && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-rw-line bg-rw-surface p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rw-muted">Solo Ristorante</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <BadgeEuro className="h-4 w-4 text-rw-muted" />
                      <span className="text-rw-muted">Prezzo:</span>
                      <span className="font-semibold text-rw-ink">{euro(data.partner.licensePrice)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {data.partner.commissionType === "percent" ? (
                        <>
                          <Percent className="h-4 w-4 text-emerald-400" />
                          <span className="text-rw-muted">Commissione:</span>
                          <span className="font-semibold text-emerald-400">{data.partner.commissionPct}%</span>
                        </>
                      ) : (
                        <>
                          <BadgeEuro className="h-4 w-4 text-emerald-400" />
                          <span className="text-rw-muted">Commissione:</span>
                          <span className="font-semibold text-emerald-400">{euro(data.partner.commissionEuros)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
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
                        {data.partner.commissionType === "percent" ? (
                          <>
                            <Percent className="h-4 w-4 text-emerald-400" />
                            <span className="text-rw-muted">Commissione:</span>
                            <span className="font-semibold text-emerald-400">{data.partner.allInclusivePct ?? data.partner.commissionPct}%</span>
                          </>
                        ) : (
                          <>
                            <BadgeEuro className="h-4 w-4 text-emerald-400" />
                            <span className="text-rw-muted">Commissione:</span>
                            <span className="font-semibold text-emerald-400">{euro(data.partner.allInclusiveCommission)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* License Table */}
            <div className="overflow-hidden rounded-2xl border border-rw-line bg-rw-surface">
              <div className="border-b border-rw-line px-5 py-4">
                <h2 className="font-semibold text-rw-ink">Lista clienti</h2>
                <p className="mt-0.5 text-xs text-rw-muted">Ogni riga è un cliente attivato con licenza partner.</p>
              </div>

              {loading && !data ? (
                <div className="flex items-center justify-center py-16 text-rw-muted text-sm">
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> Caricamento…
                </div>
              ) : data?.licenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-rw-muted">
                  <Users className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Nessun cliente ancora registrato.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rw-line bg-rw-surfaceAlt/60">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Cliente</th>
                        {isSuperAdmin && !filterPartner && (
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Dealer</th>
                        )}
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
                          {isSuperAdmin && !filterPartner && (
                            <td className="px-4 py-3.5 text-rw-soft text-xs">
                              {row.partnerName && (
                                <span className="inline-flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {row.partnerName}
                                </span>
                              )}
                            </td>
                          )}
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
                    {data && data.licenses.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-rw-line bg-rw-surfaceAlt/60 font-semibold">
                          <td className="px-5 py-3 text-rw-ink" colSpan={isSuperAdmin && !filterPartner ? 6 : 5}>
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
          </>
        )}

        {tab === "partners" && isSuperAdmin && (
          <div className="overflow-hidden rounded-2xl border border-rw-line bg-rw-surface">
            <div className="border-b border-rw-line px-5 py-4">
              <h2 className="font-semibold text-rw-ink">Dealer / Partner registrati</h2>
              <p className="mt-0.5 text-xs text-rw-muted">Gestisci i dealer da qualsiasi paese. Imposta commissione fissa o percentuale.</p>
            </div>

            {partners.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-rw-muted">
                <Globe className="h-10 w-10 opacity-30" />
                <p className="text-sm">Nessun dealer registrato.</p>
                <button
                  type="button"
                  onClick={() => { setEditPartner(null); setModalOpen(true); }}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rw-accent/85"
                >
                  <Plus className="h-4 w-4" /> Aggiungi il primo dealer
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rw-line bg-rw-surfaceAlt/60">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Dealer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Paese</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Codice</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Tipo Comm.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">Ristorante</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">All Inclusive</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-rw-muted">Licenze</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-rw-muted">Stato</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-rw-muted">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rw-line">
                    {partners.map((p) => (
                      <tr key={p.id} className="hover:bg-rw-surfaceAlt/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-rw-ink">{p.name}</p>
                          {p.email && <p className="text-xs text-rw-muted">{p.email}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-rw-soft">{p.country}</td>
                        <td className="px-4 py-3.5">
                          <code className="rounded bg-rw-surfaceAlt px-1.5 py-0.5 text-xs font-mono text-rw-soft">{p.code}</code>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${p.commissionType === "percent" ? "border-violet-500/30 bg-violet-500/10 text-violet-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>
                            {p.commissionType === "percent" ? <><Percent className="h-3 w-3" /> Percentuale</> : <><BadgeEuro className="h-3 w-3" /> Fisso</>}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-rw-ink tabular-nums">
                          {euro(p.licensePrice)}
                          <span className="ml-1 text-emerald-400">
                            ({p.commissionType === "percent" ? `${p.commissionPct}%` : euro(p.commissionEuros)})
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-rw-ink tabular-nums">
                          {p.allInclusivePrice != null ? (
                            <>
                              {euro(p.allInclusivePrice)}
                              <span className="ml-1 text-emerald-400">
                                ({p.commissionType === "percent" ? `${p.allInclusivePct ?? p.commissionPct}%` : euro(p.allInclusiveCommission)})
                              </span>
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-center tabular-nums font-semibold text-rw-ink">
                          {p._count?.licenses ?? 0}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${p.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
                            {p.active ? "Attivo" : "Disattivato"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => { setEditPartner(p); setModalOpen(true); }}
                              className="rounded-lg p-1.5 text-rw-muted hover:text-rw-ink hover:bg-rw-surfaceAlt transition"
                              title="Modifica"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeletePartner(p)}
                              className="rounded-lg p-1.5 text-rw-muted hover:text-red-400 hover:bg-red-500/10 transition"
                              title="Elimina"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <PartnerModal
          partner={editPartner}
          onClose={() => { setModalOpen(false); setEditPartner(null); }}
          onSave={handleSavePartner}
        />
      )}
    </div>
  );
}

/* ────────── Partner Create/Edit Modal ────────── */

function PartnerModal({
  partner,
  onClose,
  onSave,
}: {
  partner: Partner | null;
  onClose: () => void;
  onSave: (data: Partial<Partner>) => Promise<void>;
}) {
  const isEdit = partner !== null;
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState(partner?.code || "");
  const [name, setName] = useState(partner?.name || "");
  const [country, setCountry] = useState(partner?.country || "");
  const [email, setEmail] = useState(partner?.email || "");
  const [phone, setPhone] = useState(partner?.phone || "");
  const [notes, setNotes] = useState(partner?.notes || "");
  const [commissionType, setCommissionType] = useState<"fixed" | "percent">(partner?.commissionType || "fixed");
  const [licensePrice, setLicensePrice] = useState(partner?.licensePrice ?? 79);
  const [commissionEuros, setCommissionEuros] = useState(partner?.commissionEuros ?? 29);
  const [commissionPct, setCommissionPct] = useState(partner?.commissionPct ?? 30);
  const [allInclusivePrice, setAllInclusivePrice] = useState(partner?.allInclusivePrice ?? 0);
  const [allInclusiveCommission, setAllInclusiveCommission] = useState(partner?.allInclusiveCommission ?? 0);
  const [allInclusivePct, setAllInclusivePct] = useState(partner?.allInclusivePct ?? 30);
  const [hasAllInclusive, setHasAllInclusive] = useState((partner?.allInclusivePrice ?? 0) > 0);
  const [active, setActive] = useState(partner?.active ?? true);

  const handleSubmit = async () => {
    if (!name.trim() || (!isEdit && !code.trim()) || !country.trim()) {
      alert("Compila almeno Nome, Codice e Paese");
      return;
    }
    setSaving(true);
    await onSave({
      code: code.trim().toLowerCase(),
      name: name.trim(),
      country: country.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      commissionType,
      licensePrice,
      commissionEuros: commissionType === "fixed" ? commissionEuros : 0,
      commissionPct: commissionType === "percent" ? commissionPct : 0,
      allInclusivePrice: hasAllInclusive ? allInclusivePrice : null,
      allInclusiveCommission: hasAllInclusive && commissionType === "fixed" ? allInclusiveCommission : null,
      allInclusivePct: hasAllInclusive && commissionType === "percent" ? allInclusivePct : null,
      active,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-rw-line bg-rw-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-rw-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-rw-ink">
            {isEdit ? "Modifica Dealer" : "Nuovo Dealer"}
          </h2>
          <button type="button" onClick={onClose} className="text-rw-muted hover:text-rw-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome dealer *" value={name} onChange={setName} placeholder="Es. Mario Rossi Agency" />
            <Field label="Codice *" value={code} onChange={setCode} placeholder="es. italia-nord" disabled={isEdit} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Paese *" value={country} onChange={setCountry} placeholder="Es. Italia" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="dealer@email.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefono" value={phone} onChange={setPhone} placeholder="+39..." />
            <div>
              <label className="mb-1 block text-xs font-semibold text-rw-muted">Stato</label>
              <select
                value={active ? "active" : "inactive"}
                onChange={(e) => setActive(e.target.value === "active")}
                className="w-full rounded-xl border border-rw-line bg-rw-bg px-3 py-2.5 text-sm text-rw-ink"
              >
                <option value="active">Attivo</option>
                <option value="inactive">Disattivato</option>
              </select>
            </div>
          </div>
          <Field label="Note" value={notes} onChange={setNotes} placeholder="Appunti interni..." />

          {/* Commission type */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-rw-muted uppercase tracking-wider">Tipo commissione</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCommissionType("fixed")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${commissionType === "fixed" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-rw-line text-rw-muted hover:text-rw-ink"}`}
              >
                <BadgeEuro className="h-4 w-4" /> Fisso (€)
              </button>
              <button
                type="button"
                onClick={() => setCommissionType("percent")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${commissionType === "percent" ? "border-violet-500/40 bg-violet-500/10 text-violet-400" : "border-rw-line text-rw-muted hover:text-rw-ink"}`}
              >
                <Percent className="h-4 w-4" /> Percentuale (%)
              </button>
            </div>
          </div>

          {/* Restaurant tier */}
          <div className="rounded-xl border border-rw-line p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Ristorante</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Prezzo licenza (€)" value={licensePrice} onChange={setLicensePrice} />
              {commissionType === "fixed" ? (
                <NumField label="Commissione (€)" value={commissionEuros} onChange={setCommissionEuros} />
              ) : (
                <NumField label="Commissione (%)" value={commissionPct} onChange={setCommissionPct} />
              )}
            </div>
            {commissionType === "percent" && licensePrice > 0 && (
              <p className="text-xs text-rw-muted">
                = {euro(Math.round(licensePrice * commissionPct / 100 * 100) / 100)} per licenza
              </p>
            )}
          </div>

          {/* All Inclusive toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAllInclusive}
              onChange={(e) => setHasAllInclusive(e.target.checked)}
              className="rounded border-rw-line"
            />
            <span className="text-sm text-rw-ink font-medium">Offre anche piano All Inclusive</span>
          </label>

          {hasAllInclusive && (
            <div className="rounded-xl border border-rw-accent/30 bg-rw-accent/5 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-rw-accent">All Inclusive</p>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Prezzo licenza (€)" value={allInclusivePrice} onChange={setAllInclusivePrice} />
                {commissionType === "fixed" ? (
                  <NumField label="Commissione (€)" value={allInclusiveCommission} onChange={setAllInclusiveCommission} />
                ) : (
                  <NumField label="Commissione (%)" value={allInclusivePct} onChange={setAllInclusivePct} />
                )}
              </div>
              {commissionType === "percent" && allInclusivePrice > 0 && (
                <p className="text-xs text-rw-muted">
                  = {euro(Math.round(allInclusivePrice * allInclusivePct / 100 * 100) / 100)} per licenza
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-rw-line px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-rw-line px-4 py-2 text-sm font-semibold text-rw-muted hover:text-rw-ink transition">
            Annulla
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="rounded-xl bg-rw-accent px-6 py-2 text-sm font-semibold text-white hover:bg-rw-accent/85 disabled:opacity-50 transition"
          >
            {saving ? "Salvataggio…" : isEdit ? "Salva modifiche" : "Crea dealer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────── Shared sub-components ────────── */

function Field({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-rw-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-rw-line bg-rw-bg px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-rw-accent"
      />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-rw-muted">{label}</label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-xl border border-rw-line bg-rw-bg px-3 py-2.5 text-sm text-rw-ink tabular-nums focus:outline-none focus:ring-1 focus:ring-rw-accent"
      />
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: "emerald" | "red" | "accent" }) {
  const valueStyle = accent === "emerald" ? "text-emerald-400" : accent === "red" ? "text-red-400" : accent === "accent" ? "text-rw-accent" : "text-rw-ink";
  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
      <div className="flex items-center gap-2 text-rw-muted">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${valueStyle}`}>{value}</p>
    </div>
  );
}
