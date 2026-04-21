import { BedDouble, ChefHat, Package, UtensilsCrossed } from "lucide-react";
import { HOMEPAGE_COPY } from "@/core/i18n/seo-content";
import type { Locale } from "@/core/i18n/types";

const ICONS = [UtensilsCrossed, ChefHat, Package, BedDouble];
const ACCENTS = [
  "from-landing-violet to-landing-magenta",
  "from-landing-magenta to-landing-pink",
  "from-landing-violet to-landing-magentaSoft",
  "from-landing-pink to-landing-violet",
];

export function FeatureCards({ locale = "it" }: { locale?: Locale } = {}) {
  const copy = HOMEPAGE_COPY[locale];
  return (
    <section id="funzioni" className="relative py-24 md:py-32">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
            {copy.featuresEyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
            {copy.featuresH2}
          </h2>
          <p className="mt-4 text-landing-soft">{copy.featuresLead}</p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {copy.features.map((feature, idx) => {
            const Icon = ICONS[idx % ICONS.length];
            const accent = ACCENTS[idx % ACCENTS.length];
            return (
              <article
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-landing-line bg-landing-card p-6 transition-all duration-rw hover:-translate-y-0.5 hover:border-landing-magenta/40 hover:shadow-landing-soft"
              >
                <div
                  aria-hidden
                  className={`absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br ${accent} opacity-30 blur-3xl transition-opacity duration-rw group-hover:opacity-50`}
                />
                <div className="relative">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-landing-soft`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
