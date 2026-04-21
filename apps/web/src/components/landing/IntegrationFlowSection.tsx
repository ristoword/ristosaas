import { ArrowRight, ChefHat, CreditCard, Package, UtensilsCrossed } from "lucide-react";
import { HOMEPAGE_COPY } from "@/core/i18n/seo-content";
import type { Locale } from "@/core/i18n/types";

const ICONS = [UtensilsCrossed, ChefHat, Package, CreditCard];
const ACCENTS = [
  "from-landing-violet to-landing-magenta",
  "from-landing-magenta to-landing-pink",
  "from-landing-violet to-landing-magentaSoft",
  "from-landing-pink to-landing-violet",
];

export function IntegrationFlowSection({ locale = "it" }: { locale?: Locale } = {}) {
  const copy = HOMEPAGE_COPY[locale];

  return (
    <section id="come-funziona" className="relative py-24 md:py-32">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
            {copy.integrationEyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
            {copy.integrationH2}
          </h2>
          <p className="mt-4 text-landing-soft">{copy.integrationLead}</p>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {copy.integrationFlows.map((flow, idx) => {
            const Icon = ICONS[idx % ICONS.length];
            const accent = ACCENTS[idx % ACCENTS.length];
            return (
              <li
                key={flow.from}
                className="group relative overflow-hidden rounded-3xl border border-landing-line bg-landing-card p-6 transition-all duration-rw hover:-translate-y-0.5 hover:border-landing-magenta/40"
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-landing-soft`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-4 font-display text-lg font-semibold text-landing-ink">{flow.from}</p>
                <p className="mt-2 flex items-center gap-2 text-sm leading-relaxed text-landing-soft">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-landing-magentaSoft" aria-hidden />
                  <span>{flow.arrow}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
