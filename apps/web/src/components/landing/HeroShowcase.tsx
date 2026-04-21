import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { HOMEPAGE_COPY } from "@/core/i18n/seo-content";
import type { Locale } from "@/core/i18n/types";
import { PhoneMockup, TabletMockup } from "./mockups";
import { DashboardShowcase } from "./DashboardShowcase";

/**
 * Optional hero screenshot: drop a PNG at `public/landing/dashboard-hero.png`
 * (or set NEXT_PUBLIC_LANDING_DASHBOARD_IMAGE) and it replaces the JSX mockup
 * seamlessly.
 */
const HERO_DASHBOARD_IMAGE =
  process.env.NEXT_PUBLIC_LANDING_DASHBOARD_IMAGE?.trim() || undefined;

export function HeroShowcase({ locale = "it" }: { locale?: Locale } = {}) {
  const copy = HOMEPAGE_COPY[locale];
  const demoHref = `mailto:hello@gestionesemplificata.com?subject=${encodeURIComponent(
    copy.demoMailSubject,
  )}&body=${encodeURIComponent(copy.demoMailBody)}`;
  return (
    <section className="relative overflow-hidden pb-16 pt-28 md:pb-28 md:pt-36">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-landing-hero"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-landing-grid bg-[length:42px_42px] opacity-[0.06]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[320px] h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-landing-magenta/40 blur-[120px] animate-landing-pulse-glow"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="animate-landing-fade-up inline-flex items-center gap-2 rounded-full border border-landing-line bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-soft backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-landing-magentaSoft" aria-hidden />
            {copy.heroBadge}
          </span>

          <h1 className="animate-landing-fade-up mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-landing-ink sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-br from-white via-landing-ink to-landing-soft bg-clip-text text-transparent">
              {copy.heroH1Part1}
              <br className="hidden sm:block" /> {copy.heroH1Part2}
            </span>
          </h1>

          <p
            className="animate-landing-fade-up mt-5 max-w-2xl text-base text-landing-soft sm:text-lg md:text-xl"
            style={{ animationDelay: "60ms" }}
          >
            {copy.heroSub}
          </p>

          <div
            className="animate-landing-fade-up mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "120ms" }}
          >
            <a
              href={demoHref}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-7 py-3.5 text-sm font-semibold text-white shadow-landing-card transition-transform duration-rw hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-magenta"
            >
              {copy.ctaDemo}
              <ArrowRight className="h-4 w-4 transition-transform duration-rw group-hover:translate-x-0.5" aria-hidden />
            </a>
            <Link
              href={ROUTES.login}
              className="inline-flex items-center gap-2 rounded-full border border-landing-line bg-white/5 px-7 py-3.5 text-sm font-semibold text-landing-ink transition-all duration-rw hover:border-landing-magenta/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-magenta"
            >
              {copy.ctaAccess}
            </Link>
          </div>

          <a
            href="https://gestionesemplificata.com"
            target="_blank"
            rel="noreferrer"
            className="animate-landing-fade-up mt-6 text-xs font-medium text-landing-muted transition-colors hover:text-landing-ink"
            style={{ animationDelay: "180ms" }}
          >
            gestionesemplificata.com
          </a>
        </div>

        {/* Showcase layout */}
        <div
          className="animate-landing-fade-up relative mx-auto mt-16 w-full max-w-6xl md:mt-24"
          style={{ animationDelay: "240ms" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-[40px] bg-landing-hero blur-3xl"
          />

          {/* Desktop dashboard — always visible, scales down on mobile */}
          <div className="relative mx-auto w-full max-w-5xl">
            <DashboardShowcase imageSrc={HERO_DASHBOARD_IMAGE} priority />
          </div>

          {/* Tablet overlap — slightly smaller on mobile but still overlapped */}
          <div className="pointer-events-none absolute left-[-4%] top-[28%] w-[120px] animate-landing-float sm:left-[-5%] sm:w-[160px] md:left-[-6%] md:top-[22%] md:w-[200px] lg:w-[240px] xl:w-[260px]">
            <TabletMockup />
          </div>

          {/* Phone overlap (right) — visible from mobile */}
          <div
            className="pointer-events-none absolute right-[-4%] top-[-4%] w-[108px] animate-landing-float sm:w-[140px] md:w-[180px] lg:w-[210px]"
            style={{ animationDelay: "400ms" }}
          >
            <PhoneMockup variant="bookings" />
          </div>

          {/* Small secondary phone (bottom-left) — visible from mobile */}
          <div
            className="pointer-events-none absolute bottom-[-10%] left-[6%] w-[96px] animate-landing-float sm:w-[120px] md:w-[150px] lg:w-[170px]"
            style={{ animationDelay: "800ms" }}
          >
            <PhoneMockup variant="orders" />
          </div>
        </div>
      </div>
    </section>
  );
}
