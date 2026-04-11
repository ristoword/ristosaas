import {
  ArrowRight,
  Clock3,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { navSections } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "Coperti previsti",
    value: "—",
    sub: "Quando colleghiamo i moduli, qui vedrai i numeri veri.",
    tone: "from-rw-accent/15 to-rw-accentSoft/10",
  },
  {
    label: "Tavoli liberi",
    value: "—",
    sub: "Stato sala in tempo reale, senza aprire mille schermate.",
    tone: "from-emerald-500/15 to-emerald-400/5",
  },
  {
    label: "Ordini in corso",
    value: "—",
    sub: "Sala e cucina sempre d'accordo, con un colore per stato.",
    tone: "from-amber-400/20 to-amber-300/5",
  },
];

const quickActions = [
  {
    title: "Apri un tavolo",
    body: "Grande, verde, impossibile sbagliare.",
    icon: Zap,
  },
  {
    title: "Controlla la sala",
    body: "Vedi cosa succede senza perderti.",
    icon: HeartHandshake,
  },
  {
    title: "Chiudi la giornata",
    body: "In un solo posto, quando sarà pronto.",
    icon: ShieldCheck,
  },
];

export function DashboardHome() {
  const modules = navSections.flatMap((s) => s.items).filter((i) => i.id !== "dashboard");

  return (
    <div className="space-y-10 md:space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-rw-line bg-rw-surface p-6 shadow-rw-sm md:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rw-accentGlow blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-rw-line bg-rw-surfaceAlt px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rw-soft">
              <Sparkles className="h-3.5 w-3.5 text-rw-accent" aria-hidden />
              SaaS che sembra un gioco, lavora come un professionista
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-rw-ink md:text-4xl">
              Tutto sotto controllo,{" "}
              <span className="text-rw-accent">senza pensarci troppo</span>.
            </h1>
            <p className="text-base text-rw-soft md:text-lg">
              Pochi colori, parole chiare, pulsanti grandi: così chiunque può
              usarlo in mezzo al casino di una serata piena. I moduli arriveranno
              uno alla volta: li collegheremo senza stravolgere questo stile.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 md:flex-col md:items-stretch">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-muted">
              <Clock3 className="h-5 w-5 text-rw-accent" aria-hidden />
              <span>
                Modalità dimostrativa: nessun dato reale ancora collegato.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="stats-heading" className="grid gap-4 md:grid-cols-3">
        <h2 id="stats-heading" className="sr-only">
          Indicatori principali
        </h2>
        {stats.map((s) => (
          <article
            key={s.label}
            className={cn(
              "rounded-3xl border border-rw-line bg-gradient-to-br p-5 shadow-sm",
              s.tone,
            )}
          >
            <p className="text-sm font-medium text-rw-muted">{s.label}</p>
            <p className="mt-2 font-display text-4xl font-semibold text-rw-ink">
              {s.value}
            </p>
            <p className="mt-2 text-sm text-rw-soft">{s.sub}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="quick-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="quick-heading"
              className="font-display text-xl font-semibold text-rw-ink"
            >
              Cosa vuoi fare adesso?
            </h2>
            <p className="text-sm text-rw-muted">
              Tre azioni enormi: niente menu nascosti, niente termini strani.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.title}
                type="button"
                disabled
                className="group flex flex-col items-start gap-4 rounded-3xl border border-dashed border-rw-line bg-rw-surface p-6 text-left shadow-sm transition hover:border-rw-accent/30 hover:shadow-rw-sm disabled:cursor-not-allowed disabled:opacity-80"
                title="Si collegherà ai moduli sala e ordini."
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rw-surfaceAlt text-rw-accent ring-1 ring-rw-line">
                  <Icon className="h-7 w-7" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-rw-ink">
                    {a.title}
                  </p>
                  <p className="mt-1 text-sm text-rw-muted">{a.body}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-rw-accent">
                  In arrivo
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="modules-heading" className="space-y-4">
        <div>
          <h2
            id="modules-heading"
            className="font-display text-xl font-semibold text-rw-ink"
          >
            I tuoi strumenti
          </h2>
          <p className="text-sm text-rw-muted">
            Ogni riquadro è un modulo: quando è pronto, lo accendiamo dalla
            stessa home. Un solo posto, un solo stile RistoWord.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            const inner = (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rw-surfaceAlt text-rw-accent ring-1 ring-rw-line">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold text-rw-ink">
                        {m.label}
                      </p>
                      {!m.ready ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rw-muted">
                          Presto
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                          Attivo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-rw-muted">{m.hint}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-rw-muted">
                  Un backend unico per tutti i ristoranti: qui vedi solo la
                  facciata semplice, i dati restano ordinati sotto.
                </p>
              </>
            );

            return (
              <li key={m.id}>
                {m.ready ? (
                  <Link
                    href={m.href}
                    className="flex h-full flex-col rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm transition hover:border-rw-accent/35 hover:shadow-rw-sm"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
