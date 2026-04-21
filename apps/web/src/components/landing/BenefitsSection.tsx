import { Check, XCircle } from "lucide-react";

const LEGACY = [
  "un gestionale per il ristorante",
  "uno per l'hotel",
  "uno per il magazzino",
  "fogli Excel per collegare i dati",
];

const BENEFITS = [
  {
    title: "Meno errori operativi",
    body: "Niente trascrizioni manuali tra sistemi. Sala, cucina, magazzino e reception usano la stessa fonte dei dati.",
  },
  {
    title: "Meno software da gestire",
    body: "Un solo accesso, una sola licenza, un solo fornitore. Zero integrazioni da manutenere.",
  },
  {
    title: "Maggiore controllo",
    body: "Stato ordini, scorte, prenotazioni e incassi visibili in tempo reale dallo stesso pannello.",
  },
  {
    title: "Dati centralizzati",
    body: "Multi-tenant sicuro con RBAC, backup automatico, audit trail sulle azioni sensibili.",
  },
];

export function BenefitsSection() {
  return (
    <section id="vantaggi" className="relative py-24 md:py-32">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
            Differenza
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
            Perché è diverso dagli altri software
          </h2>
          <p className="mt-4 text-landing-soft">
            La maggior parte delle strutture horeca oggi usa tre o quattro software separati
            che non si parlano tra loro. Qui è tutto nello stesso sistema.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-muted">
              Gli altri usano
            </p>
            <ul className="mt-4 space-y-3">
              {LEGACY.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-landing-soft">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-landing-muted" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-landing-magenta/40 bg-landing-card p-6 shadow-landing-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-magentaSoft">
              RistoSaaS fa
            </p>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3 text-sm text-landing-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-landing-magentaSoft" aria-hidden />
                <span>Un unico sistema integrato per ristorante, cucina, magazzino e hotel.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-landing-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-landing-magentaSoft" aria-hidden />
                <span>Flussi automatici tra sala, cucina, magazzino e camere.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-landing-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-landing-magentaSoft" aria-hidden />
                <span>Zero doppie registrazioni, zero integrazioni da manutenere.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-landing-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-landing-magentaSoft" aria-hidden />
                <span>Dashboard unica con dati in tempo reale.</span>
              </li>
            </ul>
          </article>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <article
              key={b.title}
              className="group relative overflow-hidden rounded-3xl border border-landing-line bg-landing-card p-6 transition-all duration-rw hover:-translate-y-0.5 hover:border-landing-magenta/40"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-violet to-landing-magenta text-white shadow-landing-soft">
                <Check className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-landing-soft">{b.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
