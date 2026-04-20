import { Building2, CreditCard, Receipt, Sparkles } from "lucide-react";

const FEATURES = [
  {
    title: "Ordini live",
    body: "Sala, cucina, bar e delivery parlano in tempo reale. Niente più fogli volanti, niente più errori.",
    Icon: Receipt,
    accent: "from-landing-violet to-landing-magenta",
  },
  {
    title: "Prenotazioni hotel",
    body: "Reception, housekeeping e rate plan in un unico flusso. Check-in veloci e camere sempre sincronizzate.",
    Icon: Building2,
    accent: "from-landing-magenta to-landing-pink",
  },
  {
    title: "Pagamenti e billing",
    body: "Stripe integrato. Sottoscrizioni, fatturazione e riconciliazioni gestite nativamente nella piattaforma.",
    Icon: CreditCard,
    accent: "from-landing-violet to-landing-magentaSoft",
  },
  {
    title: "Multi-tenant centralizzato",
    body: "Gestisci più strutture, licenze e ruoli da un unico pannello con RBAC granulare e audit trail.",
    Icon: Sparkles,
    accent: "from-landing-pink to-landing-violet",
  },
];

export function FeatureCards() {
  return (
    <section id="funzioni" className="relative py-24 md:py-32">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
            Funzioni
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
            Tutto ciò che serve a chi vive la struttura.
          </h2>
          <p className="mt-4 text-landing-soft">
            Una piattaforma costruita per chi lavora davvero in sala, cucina e reception — non per chi guarda i report.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl border border-landing-line bg-landing-card p-6 transition-all duration-rw hover:-translate-y-0.5 hover:border-landing-magenta/40 hover:shadow-landing-soft"
            >
              <div
                aria-hidden
                className={`absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br ${feature.accent} opacity-30 blur-3xl transition-opacity duration-rw group-hover:opacity-50`}
              />
              <div className="relative">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white shadow-landing-soft`}>
                  <feature.Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-landing-soft">{feature.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
