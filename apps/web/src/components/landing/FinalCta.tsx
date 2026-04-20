import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export function FinalCta() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <div className="relative overflow-hidden rounded-[40px] border border-landing-line bg-landing-surface shadow-landing-card">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-landing-hero opacity-90"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-landing-bg to-transparent"
          />

          <div className="relative grid gap-10 px-8 py-14 md:grid-cols-[1.2fr_1fr] md:px-14 md:py-20">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
                Inizia ora
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
                La tua struttura, finalmente sotto controllo.
              </h2>
              <p className="mt-4 max-w-xl text-landing-soft">
                Accedi se hai già un account, oppure richiedi una demo e ti mostriamo come RistoSaaS si adatta al tuo locale.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={ROUTES.login}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-7 py-3.5 text-sm font-semibold text-white shadow-landing-card transition-transform duration-rw hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-magenta"
                >
                  Login
                  <ArrowRight className="h-4 w-4 transition-transform duration-rw group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <a
                  href="mailto:hello@gestionesemplificata.com?subject=RistoSaaS%20%E2%80%93%20Richiesta%20demo"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-white/5 px-7 py-3.5 text-sm font-semibold text-landing-ink transition-all duration-rw hover:border-landing-magenta/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-magenta"
                >
                  Richiedi demo
                </a>
              </div>

              <p className="mt-6 text-xs text-landing-muted">
                RistoSaaS è parte dell&apos;ecosistema{" "}
                <a
                  href="https://gestionesemplificata.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-landing-soft underline decoration-landing-magenta/40 underline-offset-4 hover:text-landing-ink"
                >
                  gestionesemplificata.com
                </a>
                .
              </p>
            </div>

            <aside className="rounded-3xl border border-landing-line bg-landing-card p-6 text-sm text-landing-soft backdrop-blur md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-landing-muted">
                Cosa ottieni
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  "Dashboard operativa pronta all'uso",
                  "Ristorante + hotel sincronizzati",
                  "Stripe e fatturazione integrati",
                  "Accesso owner, staff, supervisor",
                  "Supporto diretto e onboarding guidato",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-landing-violet to-landing-magenta" />
                    <span className="text-landing-ink">{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
