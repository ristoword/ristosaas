import { Check, XCircle } from "lucide-react";
import { HOMEPAGE_COPY } from "@/core/i18n/seo-content";
import type { Locale } from "@/core/i18n/types";

const LEGACY_LABELS: Record<Locale, string> = {
  it: "Gli altri usano",
  en: "Others use",
  nl: "Anderen gebruiken",
};

const OURS_LABELS: Record<Locale, string> = {
  it: "RistoSaaS fa",
  en: "RistoSaaS delivers",
  nl: "RistoSaaS levert",
};

export function BenefitsSection({ locale = "it" }: { locale?: Locale } = {}) {
  const copy = HOMEPAGE_COPY[locale];
  return (
    <section id="vantaggi" className="relative py-24 md:py-32">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
            {copy.differenceEyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
            {copy.differenceH2}
          </h2>
          <p className="mt-4 text-landing-soft">{copy.differenceLead}</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-muted">
              {LEGACY_LABELS[locale]}
            </p>
            <ul className="mt-4 space-y-3">
              {copy.legacy.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-landing-soft">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-landing-muted" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-landing-magenta/40 bg-landing-card p-6 shadow-landing-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-magentaSoft">
              {OURS_LABELS[locale]}
            </p>
            <ul className="mt-4 space-y-3">
              {copy.ours.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-landing-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-landing-magentaSoft" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.benefitsGrid.map((b) => (
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
