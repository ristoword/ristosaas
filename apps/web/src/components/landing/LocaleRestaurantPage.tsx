import Link from "next/link";
import { ArrowRight, ChefHat, ClipboardList, Package, UtensilsCrossed } from "lucide-react";
import { SeoPageShell } from "@/components/landing/SeoPageShell";
import { SoftwareApplicationJsonLd } from "@/components/landing/SoftwareApplicationJsonLd";
import { RESTAURANT_COPY } from "@/core/i18n/seo-content";
import { absUrl, pillarPath, restaurantPath } from "@/core/i18n/locale-urls";
import type { Locale } from "@/core/i18n/types";

const ICON_MAP: Record<"tables" | "orders" | "status" | "warehouse", typeof UtensilsCrossed> = {
  tables: UtensilsCrossed,
  orders: ClipboardList,
  status: ChefHat,
  warehouse: Package,
};

const ACCENT_SEQ = [
  "from-landing-violet to-landing-magenta",
  "from-landing-magenta to-landing-pink",
  "from-landing-violet to-landing-magentaSoft",
  "from-landing-pink to-landing-violet",
];

export function LocaleRestaurantPage({ locale }: { locale: Locale }) {
  const copy = RESTAURANT_COPY[locale];
  const demoHref = `mailto:hello@gestionesemplificata.com?subject=${encodeURIComponent(
    copy.demoMailSubject,
  )}&body=${encodeURIComponent(copy.demoMailBody)}`;

  return (
    <SeoPageShell locale={locale}>
      <SoftwareApplicationJsonLd
        locale={locale}
        name="RistoSaaS — Cloud Restaurant Management"
        url={absUrl(restaurantPath(locale))}
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
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-7 py-3.5 text-sm font-semibold text-white shadow-landing-card hover:scale-[1.02] transition-transform"
          >
            {copy.ctaDemo}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-white/5 px-7 py-3.5 text-sm font-semibold text-landing-ink hover:border-landing-magenta/60 hover:bg-white/10 transition-all"
          >
            {copy.ctaAccess}
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          {copy.whatIncludesH2}
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {copy.features.map((feature, idx) => {
            const Icon = ICON_MAP[feature.iconKey];
            const accent = ACCENT_SEQ[idx % ACCENT_SEQ.length];
            return (
              <article key={feature.title} className="rounded-3xl border border-landing-line bg-landing-card p-6">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-landing-soft">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <div className="rounded-[32px] border border-landing-line bg-landing-card p-10 md:p-14">
          <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl">{copy.crossLinkH2}</h2>
          <p className="mt-3 text-landing-soft">{copy.crossLinkBody}</p>
          <div className="mt-6">
            <Link
              href={pillarPath(locale)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-6 py-3 text-sm font-semibold text-white"
            >
              {copy.crossLinkCta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </SeoPageShell>
  );
}
