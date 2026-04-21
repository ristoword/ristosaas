import { BedDouble, ChefHat, Package, UtensilsCrossed } from "lucide-react";

const FEATURES = [
  {
    title: "Ristorante",
    subtitle: "Sala, ordini, cassa",
    body: "Tavoli e sala in tempo reale, ordini veloci collegati alla cucina, stato piatti (in preparazione, pronto, servito), chiusura conto.",
    Icon: UtensilsCrossed,
    accent: "from-landing-violet to-landing-magenta",
  },
  {
    title: "Cucina (KDS)",
    subtitle: "Schermo cucina",
    body: "Comande ordinate per priorità, aggiornamento live, riduzione errori tra sala e cucina. Stato corsi in preparazione, pronto, servito.",
    Icon: ChefHat,
    accent: "from-landing-magenta to-landing-pink",
  },
  {
    title: "Magazzino",
    subtitle: "Scorte e fornitori",
    body: "Scarico ingredienti automatico su ordine, avviso scorte basse, suggerimento ordini fornitori, PDF ed email ordine al fornitore.",
    Icon: Package,
    accent: "from-landing-violet to-landing-magentaSoft",
  },
  {
    title: "Hotel",
    subtitle: "Camere e ospiti",
    body: "Prenotazioni, check-in e check-out, addebito ristorante sulla camera con folio unificato per l'ospite.",
    Icon: BedDouble,
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
            Cosa fa RistoSaaS
          </h2>
          <p className="mt-4 text-landing-soft">
            Quattro moduli pensati per lavorare insieme, non per essere comprati separatamente.
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
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-magentaSoft">
                  {feature.subtitle}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-landing-ink">
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
