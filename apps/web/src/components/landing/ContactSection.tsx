import { ArrowUpRight, Mail } from "lucide-react";
import { HOMEPAGE_COPY } from "@/core/i18n/seo-content";
import type { Locale } from "@/core/i18n/types";

export function ContactSection({ locale = "it" }: { locale?: Locale } = {}) {
  const copy = HOMEPAGE_COPY[locale];
  return (
    <section id="contatti" className="relative py-20 md:py-28">
      <div className="mx-auto w-full max-w-5xl px-5 md:px-8">
        <div className="grid gap-6 rounded-[32px] border border-landing-line bg-landing-card p-8 md:grid-cols-[1.1fr_1fr] md:p-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
              {copy.contactEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl">
              {copy.contactH2}
            </h2>
            <p className="mt-4 text-landing-soft">{copy.contactBody}</p>
          </div>

          <div className="flex flex-col justify-center gap-3">
            <a
              href="mailto:hello@gestionesemplificata.com?subject=RistoSaaS%20%E2%80%93%20Info"
              className="group flex items-center justify-between gap-3 rounded-2xl border border-landing-line bg-white/5 px-5 py-4 transition-all duration-rw hover:border-landing-magenta/60 hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-landing-violet to-landing-magenta text-white">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-landing-muted">
                    {copy.contactEmailLabel}
                  </span>
                  <span className="block text-sm font-semibold text-landing-ink">
                    hello@gestionesemplificata.com
                  </span>
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-landing-soft transition-transform duration-rw group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </a>

            <a
              href="https://gestionesemplificata.com"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-3 rounded-2xl border border-landing-line bg-white/5 px-5 py-4 transition-all duration-rw hover:border-landing-magenta/60 hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-landing-magenta to-landing-pink text-white">
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-landing-muted">
                    {copy.contactSiteLabel}
                  </span>
                  <span className="block text-sm font-semibold text-landing-ink">
                    gestionesemplificata.com
                  </span>
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-landing-soft transition-transform duration-rw group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
