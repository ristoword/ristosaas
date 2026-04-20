import { BarChart3, BedDouble, Boxes, Receipt, Users2, Utensils, Wallet } from "lucide-react";
import { DashboardShowcase } from "./DashboardShowcase";

const PREVIEW_DASHBOARD_IMAGE =
  process.env.NEXT_PUBLIC_LANDING_DASHBOARD_IMAGE?.trim() || undefined;

const MODULES = [
  { title: "Ristorante", body: "Sala, cucina, bar, delivery.", Icon: Utensils },
  { title: "Hotel", body: "Reception, camere, housekeeping.", Icon: BedDouble },
  { title: "Staff", body: "Turni, shift, presenze reali.", Icon: Users2 },
  { title: "Magazzino", body: "Scorte, carichi, scarichi, lotti.", Icon: Boxes },
  { title: "Billing", body: "Stripe, licenze, fatture.", Icon: Wallet },
  { title: "Analytics", body: "KPI live, trend, forecast.", Icon: BarChart3 },
];

export function DashboardPreview() {
  return (
    <section id="demo" className="relative py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-[520px] -translate-y-1/2 bg-landing-hero opacity-60"
      />

      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
              Dashboard
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
              Un pannello che parla la lingua di chi lavora.
            </h2>
            <p className="mt-4 max-w-xl text-landing-soft">
              KPI reali, non decorativi. Ordini live accanto a prenotazioni camera.
              Una sola interfaccia, adattiva su desktop, tablet, smartphone — e con modalità touch per la sala.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {MODULES.map((mod) => (
                <div
                  key={mod.title}
                  className="flex items-start gap-3 rounded-2xl border border-landing-line bg-landing-card p-4 transition-colors hover:border-landing-magenta/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-landing-violet/40 to-landing-magenta/30 text-landing-ink">
                    <mod.Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-landing-ink">
                      {mod.title}
                    </p>
                    <p className="mt-0.5 text-xs text-landing-soft">{mod.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-3 rounded-2xl border border-landing-line bg-landing-card px-4 py-3 text-sm text-landing-soft">
              <Receipt className="h-4 w-4 text-landing-magentaSoft" aria-hidden />
              Pagamenti e licenze gestiti nativamente via Stripe, con riconciliazione automatica.
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-[40px] bg-landing-hero blur-3xl"
            />
            <DashboardShowcase imageSrc={PREVIEW_DASHBOARD_IMAGE} />
          </div>
        </div>
      </div>
    </section>
  );
}
