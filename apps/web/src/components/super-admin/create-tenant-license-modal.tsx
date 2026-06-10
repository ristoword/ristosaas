"use client";

import { useCallback, useId, useState } from "react";
import { Check, Copy, KeyRound, Loader2, X } from "lucide-react";
import { api, type AdminTenantOnboardingResult } from "@/lib/api-client";

function slugify(name: string) {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "tenant";
}

function randomPassword(length = 14) {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "#!@$";
  const all = lower + upper + digits + special;
  const cryptoObj = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : null;
  const getRand = (pool: string) => {
    if (cryptoObj?.getRandomValues) {
      const buf = new Uint32Array(1);
      cryptoObj.getRandomValues(buf);
      return pool[buf[0] % pool.length];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };
  // Guarantee at least one of each required category
  const mandatory = [getRand(lower), getRand(upper), getRand(digits)];
  const rest: string[] = [];
  for (let i = mandatory.length; i < length; i++) rest.push(getRand(all) ?? "");
  // Shuffle
  const combined = [...mandatory, ...rest];
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(combined.length);
    cryptoObj.getRandomValues(buf);
    for (let i = combined.length - 1; i > 0; i--) {
      const j = buf[i] % (i + 1);
      [combined[i], combined[j]] = [combined[j] ?? "", combined[i] ?? ""];
    }
  }
  return combined.join("");
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateTenantLicenseModal({ open, onClose, onCreated }: Props) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<AdminTenantOnboardingResult | null>(null);
  const [donePassword, setDonePassword] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);

  const [tenantName, setTenantName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [plan, setPlan] = useState<"restaurant_only" | "hotel_only" | "all_included">("restaurant_only");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [seats, setSeats] = useState(25);
  const [licenseDurationMonths, setLicenseDurationMonths] = useState<1 | 6 | 12>(12);

  const [partnerCode, setPartnerCode] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const resetForm = useCallback(() => {
    setError(null);
    setDone(null);
    setDonePassword("");
    setCopied(null);
    setTenantName("");
    setSlug("");
    setSlugTouched(false);
    setPlan("restaurant_only");
    setBillingCycle("monthly");
    setSeats(25);
    setLicenseDurationMonths(12);
    setPartnerCode("");
    setOwnerName("");
    setOwnerEmail("");
    setOwnerUsername("");
    setOwnerPassword("");
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const onTenantNameBlur = () => {
    if (!slugTouched && tenantName.trim()) setSlug(slugify(tenantName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = tenantName.trim();
    const slugFinal = (slug.trim() ? slug : slugify(name)).trim();
    if (!name) {
      setError("Inserisci il nome della struttura / tenant.");
      return;
    }
    if (!slugFinal) {
      setError("Inserisci uno slug URL (es. baia-verde).");
      return;
    }
    if (!ownerName.trim() || !ownerEmail.trim() || !ownerUsername.trim()) {
      setError("Nome owner, email e username sono obbligatori.");
      return;
    }
    if (!ownerPassword || ownerPassword.length < 12) {
      setError("Password owner: minimo 12 caratteri.");
      return;
    }
    if (!/[a-z]/.test(ownerPassword)) {
      setError("Password owner: deve contenere almeno una lettera minuscola.");
      return;
    }
    if (!/[A-Z]/.test(ownerPassword)) {
      setError("Password owner: deve contenere almeno una lettera maiuscola.");
      return;
    }
    if (!/[0-9]/.test(ownerPassword)) {
      setError("Password owner: deve contenere almeno un numero.");
      return;
    }

    setBusy(true);
    try {
      const result = await api.admin.tenants.create({
        name,
        slug: slugFinal,
        plan,
        billingCycle,
        seats,
        licenseDurationMonths,
        partnerCode: partnerCode.trim() || undefined,
        adminUser: {
          username: ownerUsername.trim(),
          email: ownerEmail.trim().toLowerCase(),
          name: ownerName.trim(),
          password: ownerPassword,
          role: "owner",
        },
      });
      setDonePassword(ownerPassword);
      setDone(result);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creazione fallita");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Chiudi" onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-rw-line bg-rw-surface p-6 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-accent/15 text-rw-accent">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h2 id={titleId} className="font-display text-lg font-semibold text-rw-ink">
                Nuovo tenant + licenza
              </h2>
              <p className="text-xs text-rw-muted">
                Come onboarding Baia Verde: crea tenant, licenza RW-… con scadenza e utente owner (primo accesso cambio password).
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-rw-ink">
              <p className="font-semibold text-emerald-400">Tenant e licenza creati</p>
              <ul className="mt-2 space-y-1.5 text-rw-soft">
                <li>
                  Tenant: <strong>{done.tenant.name}</strong> ({done.tenant.slug})
                </li>
                <li>
                  Chiave licenza:{" "}
                  <code className="rounded bg-rw-surfaceAlt px-1 py-0.5 text-xs text-rw-accent">{done.license.key}</code>
                </li>
                <li>Scadenza: {new Date(done.license.expiresAt).toLocaleDateString("it-IT")}</li>
              </ul>
            </div>

            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt/70 p-3 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rw-muted">Credenziali da comunicare al cliente</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-rw-surface px-3 py-2">
                  <div>
                    <span className="text-[11px] text-rw-muted">Username</span>
                    <p className="font-mono text-sm font-semibold text-rw-ink">{done.adminUser.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(done.adminUser.username, "username")}
                    className="shrink-0 rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink"
                    title="Copia username"
                  >
                    {copied === "username" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-rw-surface px-3 py-2">
                  <div>
                    <span className="text-[11px] text-rw-muted">Password provvisoria</span>
                    <p className="font-mono text-sm font-semibold text-rw-accent">{donePassword}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(donePassword, "password")}
                    className="shrink-0 rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink"
                    title="Copia password"
                  >
                    {copied === "password" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-rw-surface px-3 py-2">
                  <div>
                    <span className="text-[11px] text-rw-muted">Email</span>
                    <p className="font-mono text-sm text-rw-soft">{done.adminUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(done.adminUser.email, "email")}
                    className="shrink-0 rounded-lg p-1.5 text-rw-muted hover:bg-rw-surfaceAlt hover:text-rw-ink"
                    title="Copia email"
                  >
                    {copied === "email" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-rw-muted">Al primo accesso il cliente dovrà impostare una nuova password.</p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl bg-rw-accent py-3 text-sm font-semibold text-white hover:bg-rw-accent/90"
            >
              Chiudi
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Struttura</p>
              <label className="mt-2 block">
                <span className="text-xs font-semibold text-rw-muted">Nome tenant (es. Baia Verde)</span>
                <input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  onBlur={onTenantNameBlur}
                  className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                  placeholder="Ristorante Baia Verde"
                  autoComplete="organization"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-rw-muted">Slug (URL univoco)</span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 font-mono text-sm text-rw-ink"
                  placeholder="baia-verde"
                />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-rw-muted">Piano</span>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as typeof plan)}
                    className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                  >
                    <option value="restaurant_only">Solo ristorante</option>
                    <option value="hotel_only">Solo hotel</option>
                    <option value="all_included">All inclusive</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-rw-muted">Fatturazione Stripe</span>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as typeof billingCycle)}
                    className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                  >
                    <option value="monthly">Mensile</option>
                    <option value="annual">Annuale</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-rw-muted">Posti licenza</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value, 10) || 1)}
                    className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-rw-muted">Durata licenza</span>
                  <select
                    value={licenseDurationMonths}
                    onChange={(e) => setLicenseDurationMonths(Number(e.target.value) as 1 | 6 | 12)}
                    className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                  >
                    <option value={1}>1 mese</option>
                    <option value={6}>6 mesi</option>
                    <option value={12}>12 mesi (1 anno)</option>
                  </select>
                </label>
              </div>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-rw-muted">Codice partner (opzionale)</span>
                <input
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 font-mono text-sm text-rw-ink"
                  placeholder="es. indonesia"
                />
                <p className="mt-1 text-[11px] leading-snug text-rw-muted">
                  Se venduta tramite partner, inserisci il codice (es. <code className="text-rw-soft">indonesia</code>).
                </p>
              </label>
            </div>

            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Owner (primo accesso)</p>
              <label className="mt-2 block">
                <span className="text-xs font-semibold text-rw-muted">Nome e cognome</span>
                <input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                  placeholder="Mario Rossi"
                  autoComplete="name"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-rw-muted">Email</span>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                  placeholder="owner@struttura.it"
                  autoComplete="email"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-rw-muted">Username</span>
                <input
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink"
                  placeholder="owner-miostruttura"
                  autoComplete="username"
                />
                <p className="mt-1 text-[11px] leading-snug text-rw-muted">
                  Univoco su tutta la piattaforma (non per tenant). Il demo usa già spesso <code className="text-rw-soft">owner</code>: scegli un altro nome.
                </p>
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-rw-muted">Password iniziale (min 12 car., maiusc. + num.)</span>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 font-mono text-sm text-rw-ink"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-xs font-semibold text-rw-ink"
                    onClick={() => setOwnerPassword(randomPassword(14))}
                  >
                    Genera
                  </button>
                </div>
              </label>
            </div>

            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl border border-rw-line bg-rw-surfaceAlt py-3 text-sm font-semibold text-rw-ink"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rw-accent py-3 text-sm font-semibold text-white hover:bg-rw-accent/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Crea tenant e licenza
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
