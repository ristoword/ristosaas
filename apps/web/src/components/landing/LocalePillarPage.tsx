import Link from "next/link";
import { ArrowRight, BedDouble, ChefHat, CreditCard, Package, UtensilsCrossed } from "lucide-react";
import { SeoPageShell } from "@/components/landing/SeoPageShell";
import { SoftwareApplicationJsonLd } from "@/components/landing/SoftwareApplicationJsonLd";
import { PILLAR_COPY } from "@/core/i18n/seo-content";
import { absUrl, homePath, pillarPath } from "@/core/i18n/locale-urls";
import type { Locale } from "@/core/i18n/types";

const FLOW_ICONS = [UtensilsCrossed, ChefHat, Package];
const FLOW_ACCENTS = [
  "from-landing-violet to-landing-magenta",
  "from-landing-magenta to-landing-pink",
  "from-landing-violet to-landing-magentaSoft",
];

const BLOCK_ICONS = [UtensilsCrossed, BedDouble, Package];
const BLOCK_ACCENTS = [
  "from-landing-violet to-landing-magenta",
  "from-landing-magenta to-landing-pink",
  "from-landing-violet to-landing-magentaSoft",
];

export function LocalePillarPage({ locale }: { locale: Locale }) {
  const copy = PILLAR_COPY[locale];
  const demoHref = `mailto:hello@gestionesemplificata.com?subject=${encodeURIComponent(
    copy.demoMailSubject,
  )}&body=${encodeURIComponent(copy.demoMailBody)}`;

  return (
    <SeoPageShell locale={locale}>
      <SoftwareApplicationJsonLd
        locale={locale}
        name="RistoSaaS — Integrated Restaurant & Hotel Management Software"
        url={absUrl(pillarPath(locale))}
        description={copy.description}
      />

      <section className="relative mx-auto w-full max-w-5xl px-5 pb-16 pt-8 md:px-8 md:pb-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-landing-ink sm:text-4xl md:text-5xl lg:text-6xl">
          {copy.h1}
        </h1>
        <p className="mt-6 max-w-3xl text-base text-landing-soft md:text-lg">{copy.lead}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={demoHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-7 py-3.5 text-sm font-semibold text-white shadow-landing-card transition-transform duration-rw hover:scale-[1.02]"
          >
            {copy.ctaDemo}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-white/5 px-7 py-3.5 text-sm font-semibold text-landing-ink transition-all duration-rw hover:border-landing-magenta/60 hover:bg-white/10"
          >
            {copy.ctaAccess}
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          {copy.howItWorksH2}
        </h2>
        <p className="mt-4 max-w-3xl text-landing-soft">{copy.howItWorksLead}</p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {copy.flows.map((flow, idx) => {
            const Icon = FLOW_ICONS[idx % FLOW_ICONS.length];
            const accent = FLOW_ACCENTS[idx % FLOW_ACCENTS.length];
            return (
              <article key={flow.h3Start} className="rounded-3xl border border-landing-line bg-landing-card p-6">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
                  {flow.h3Start} <span className="text-landing-magentaSoft">→</span> {flow.h3End}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-landing-soft">{flow.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          {copy.featuresH2}
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {copy.featureBlocks.map((block, idx) => {
            const Icon = BLOCK_ICONS[idx % BLOCK_ICONS.length];
            const accent = BLOCK_ACCENTS[idx % BLOCK_ACCENTS.length];
            return (
              <article key={block.title} className="rounded-3xl border border-landing-line bg-landing-card p-6">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">{block.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-landing-soft">
                  {block.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          {copy.forWhoH2}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {copy.forWhoItems.map((item) => (
            <li key={item.title} className="rounded-2xl border border-landing-line bg-landing-card p-5 text-sm text-landing-soft">
              <strong className="block text-base text-landing-ink">{item.title}</strong>
              {item.body}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          {copy.benefitsH2}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.benefits.map((v) => (
            <article key={v.title} className="rounded-2xl border border-landing-line bg-landing-card p-5">
              <h3 className="font-display text-lg font-semibold text-landing-ink">{v.title}</h3>
              <p className="mt-2 text-sm text-landing-soft">{v.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 pb-24 md:px-8">
        <div className="rounded-[32px] border border-landing-magenta/30 bg-landing-card p-10 text-center shadow-landing-soft md:p-14">
          <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
            {copy.finalH2}
          </h2>
          <p className="mt-4 text-landing-soft">{copy.finalBody}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={demoHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-7 py-3.5 text-sm font-semibold text-white shadow-landing-card"
            >
              {copy.finalDemoCta} <CreditCard className="h-4 w-4" aria-hidden />
            </a>
            <Link
              href={homePath(locale)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-white/5 px-7 py-3.5 text-sm font-semibold text-landing-ink"
            >
              {copy.finalAccessCta}
            </Link>
          </div>
        </div>
      </section>
    </SeoPageShell>
  );
}
