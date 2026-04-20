"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

type Plan = "restaurant_only" | "hotel_only" | "all_included";
type Cycle = "monthly" | "annual";

const PLANS: { id: Plan; label: string; description: string }[] = [
  { id: "restaurant_only", label: "Ristorante", description: "Sala, cucina, cassa, magazzino, delivery." },
  { id: "hotel_only", label: "Hotel", description: "Reception, camere, housekeeping, rate plans." },
  { id: "all_included", label: "All Included", description: "Ristorante + hotel integrati, folio unico." },
];

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
}

function suggestUsername(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || "owner";
  return `${base}.owner`.slice(0, 40);
}

export function SignupPage() {
  const [tenantName, setTenantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerUsername, setOwnerUsername] = useState("");
  const [plan, setPlan] = useState<Plan>("all_included");
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = useMemo(() => slugify(tenantName), [tenantName]);
  const usernameGuess = useMemo(() => (ownerUsername.trim() ? ownerUsername : suggestUsername(ownerName)), [ownerName, ownerUsername]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName,
          tenantSlug: slug,
          plan,
          billingCycle: cycle,
          owner: { name: ownerName, email: ownerEmail, username: usernameGuess },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Errore durante l'avvio del checkout.");
        setSubmitting(false);
        return;
      }
      if (typeof data?.url === "string") {
        window.location.href = data.url;
        return;
      }
      setError("Risposta Stripe incompleta.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di rete.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full border border-rw-line bg-rw-surfaceAlt px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rw-soft">
          <Sparkles className="h-3.5 w-3.5 text-rw-accent" aria-hidden />
          Attiva la tua struttura
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-rw-ink md:text-4xl">
          Crea il tuo account e paga con <span className="text-rw-accent">Stripe</span>.
        </h1>
        <p className="max-w-2xl text-rw-soft">
          Inserisci i dati della struttura e del referente. Al termine del checkout ti creiamo tenant,
          utente owner e licenza. Riceverai le credenziali temporanee all&apos;email indicata.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-5 rounded-3xl border border-rw-line bg-rw-surface p-6 shadow-rw-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wide text-rw-muted">Nome struttura</span>
              <input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
                maxLength={120}
                placeholder="Ristorante Da Mario"
                className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
              />
              <span className="text-xs text-rw-muted">Slug: <span className="font-mono text-rw-ink">{slug || "—"}</span></span>
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wide text-rw-muted">Nome referente</span>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                maxLength={120}
                placeholder="Mario Rossi"
                className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wide text-rw-muted">Email referente</span>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
                placeholder="mario@ristorante.it"
                className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wide text-rw-muted">Username referente</span>
              <input
                value={ownerUsername}
                onChange={(e) => setOwnerUsername(e.target.value)}
                maxLength={40}
                placeholder={usernameGuess}
                className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
              />
              <span className="text-xs text-rw-muted">Se vuoto useremo: <span className="font-mono text-rw-ink">{usernameGuess}</span></span>
            </label>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Piano</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    plan === p.id
                      ? "border-rw-accent bg-rw-accent/15 text-rw-ink"
                      : "border-rw-line bg-rw-surfaceAlt text-rw-soft hover:border-rw-accent/30"
                  }`}
                >
                  <span className="font-semibold">{p.label}</span>
                  <span className="mt-1 block text-xs text-rw-muted">{p.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Cadenza</legend>
            <div className="flex gap-2">
              {(["monthly", "annual"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    cycle === c
                      ? "border-rw-accent bg-rw-accent/15 text-rw-ink"
                      : "border-rw-line bg-rw-surfaceAlt text-rw-soft"
                  }`}
                >
                  {c === "monthly" ? "Mensile" : "Annuale"}
                </button>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-3 text-sm font-semibold text-white shadow-rw transition hover:bg-rw-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Avvio checkout..." : "Paga con Stripe"}
          </button>
        </div>

        <aside className="space-y-3 rounded-3xl border border-rw-line bg-rw-surface p-6 text-sm text-rw-soft shadow-rw-sm">
          <p className="font-semibold text-rw-ink">Cosa succede dopo il pagamento</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> Creiamo tenant, owner e licenza del tuo piano.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> Riceverai username e password temporanea all&apos;email.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> Al primo login ti chiederemo di cambiare password.</li>
          </ul>
        </aside>
      </form>
    </main>
  );
}
