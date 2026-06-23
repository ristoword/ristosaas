import Link from "next/link";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";
import type { Locale } from "@/core/i18n/types";
import { dictionaries } from "@/core/i18n/dictionaries";

type PlanDef = {
  badgeKey: string;
  badgeColor: string;
  nameKey: string;
  descKey: string;
  price: string;
  stripePlanKey: string;
  recommended?: boolean;
  featureKeys: string[];
};

const PLANS: PlanDef[] = [
  {
    badgeKey: "pricing.badge.ristorazione",
    badgeColor: "text-emerald-400",
    nameKey: "pricing.plan.ristoPremium",
    descKey: "pricing.desc.ristoPremium",
    price: "349",
    stripePlanKey: "risto_premium",
    featureKeys: [
      "pricing.feat.salaETavoli",
      "pricing.feat.comandeCucinaBarPizzeria",
      "pricing.feat.kds",
      "pricing.feat.magazzino",
      "pricing.feat.foodCost",
      "pricing.feat.cantinaAi",
      "pricing.feat.crm",
      "pricing.feat.haccp",
      "pricing.feat.prenotazioni",
      "pricing.feat.qrMenu",
      "pricing.feat.aiAssistant",
      "pricing.feat.briefingAi",
      "pricing.feat.multiLocale5",
    ],
  },
  {
    badgeKey: "pricing.badge.enterprise",
    badgeColor: "text-landing-magenta",
    nameKey: "pricing.plan.ristoPremiumGold",
    descKey: "pricing.desc.ristoPremiumGold",
    price: "999",
    stripePlanKey: "risto_premium_gold",
    recommended: true,
    featureKeys: [
      "pricing.feat.tuttePremium",
      "pricing.feat.ristorantiIllimitati",
      "pricing.feat.dashboardCentralizzata",
      "pricing.feat.controlloMultiLocale",
      "pricing.feat.kpiAggregati",
      "pricing.feat.monitoraggioCentralizzato",
      "pricing.feat.gestioneGruppi",
    ],
  },
  {
    badgeKey: "pricing.badge.hospitality",
    badgeColor: "text-sky-400",
    nameKey: "pricing.plan.hotelPremium",
    descKey: "pricing.desc.hotelPremium",
    price: "999",
    stripePlanKey: "hotel_premium",
    featureKeys: [
      "pricing.feat.pmsHotel",
      "pricing.feat.prenotazioniCamere",
      "pricing.feat.checkInOut",
      "pricing.feat.roomPlanner",
      "pricing.feat.housekeeping",
      "pricing.feat.roomService",
      "pricing.feat.guestFolio",
      "pricing.feat.addebitiCamera",
      "pricing.feat.qrServices",
      "pricing.feat.ristoranteCompleto",
      "pricing.feat.cantina",
      "pricing.feat.magazzino",
      "pricing.feat.aiManager",
      "pricing.feat.briefingAi",
      "pricing.feat.multiLocale5Hotel",
    ],
  },
  {
    badgeKey: "pricing.badge.enterpriseHotel",
    badgeColor: "text-amber-400",
    nameKey: "pricing.plan.hotelPremiumGold",
    descKey: "pricing.desc.hotelPremiumGold",
    price: "1.999",
    stripePlanKey: "hotel_premium_gold",
    recommended: true,
    featureKeys: [
      "pricing.feat.tutteHotelPremium",
      "pricing.feat.hotelIllimitati",
      "pricing.feat.ristorantiIllimitati",
      "pricing.feat.multiTenant",
      "pricing.feat.dashboardGlobale",
      "pricing.feat.controlloRealtime",
      "pricing.feat.reportConsolidati",
      "pricing.feat.aiManagerMulti",
      "pricing.feat.gestioneHospitality",
    ],
  },
];

const COPY: Record<Locale, { eyebrow: string; h2: string; lead: string; ctaStart: string; ctaDemo: string; perMonth: string; recommended: string; demoSubject: string; demoBody: string }> = {
  it: {
    eyebrow: "Piani e Prezzi",
    h2: "Scegli il piano perfetto per la tua struttura",
    lead: "Dalla singola trattoria alla catena internazionale. Ogni piano include aggiornamenti continui, assistenza e AI integrata.",
    ctaStart: "Inizia Ora",
    ctaDemo: "Richiedi Demo",
    perMonth: "/ mese",
    recommended: "Consigliato",
    demoSubject: "Richiesta demo RistoSimply",
    demoBody: "Buongiorno, vorrei richiedere una demo di RistoSimply.",
  },
  en: {
    eyebrow: "Plans & Pricing",
    h2: "Choose the perfect plan for your business",
    lead: "From a single restaurant to an international chain. Every plan includes continuous updates, support and integrated AI.",
    ctaStart: "Start Now",
    ctaDemo: "Request Demo",
    perMonth: "/ month",
    recommended: "Recommended",
    demoSubject: "RistoSimply demo request",
    demoBody: "Hello, I would like to request a demo of RistoSimply.",
  },
  nl: {
    eyebrow: "Plannen & Prijzen",
    h2: "Kies het perfecte plan voor uw bedrijf",
    lead: "Van een enkel restaurant tot een internationale keten. Elk plan bevat doorlopende updates, ondersteuning en geïntegreerde AI.",
    ctaStart: "Start Nu",
    ctaDemo: "Demo Aanvragen",
    perMonth: "/ maand",
    recommended: "Aanbevolen",
    demoSubject: "RistoSimply demo aanvraag",
    demoBody: "Goedendag, ik zou graag een demo van RistoSimply willen aanvragen.",
  },
  pt: {
    eyebrow: "Planos e Preços",
    h2: "Escolha o plano perfeito para o seu negócio",
    lead: "De um único restaurante a uma cadeia internacional. Cada plano inclui atualizações contínuas, suporte e IA integrada.",
    ctaStart: "Comece Agora",
    ctaDemo: "Solicitar Demo",
    perMonth: "/ mês",
    recommended: "Recomendado",
    demoSubject: "Pedido de demo RistoSimply",
    demoBody: "Bom dia, gostaria de solicitar uma demo do RistoSimply.",
  },
};

export function PricingSection({ locale = "it" }: { locale?: Locale } = {}) {
  const copy = COPY[locale];
  const dict = dictionaries[locale];
  const tx = (key: string) => dict[key] ?? key;

  const demoHref = `mailto:hello@gestionesemplificata.com?subject=${encodeURIComponent(
    copy.demoSubject,
  )}&body=${encodeURIComponent(copy.demoBody)}`;

  return (
    <section className="relative py-20 md:py-28" id="prezzi">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
            {copy.h2}
          </h2>
          <p className="mt-4 text-landing-soft">{copy.lead}</p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.stripePlanKey}
              className={`relative flex flex-col rounded-[2rem] border p-6 transition-all duration-300 ${
                plan.recommended
                  ? "border-landing-magenta/50 bg-landing-surface shadow-landing-card ring-1 ring-landing-magenta/20"
                  : "border-landing-line bg-landing-card"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-landing-soft">
                  <Star className="h-3 w-3" aria-hidden />
                  {copy.recommended}
                </span>
              )}

              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${plan.badgeColor}`}>
                {tx(plan.badgeKey)}
              </p>

              <h3 className="mt-3 font-display text-xl font-semibold text-landing-ink">
                {tx(plan.nameKey)}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-landing-soft">
                {tx(plan.descKey)}
              </p>

              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-red-400">{plan.price}€</span>
                <span className="text-sm text-landing-muted">{copy.perMonth}</span>
              </p>

              <ul className="mt-6 flex-1 space-y-2">
                {plan.featureKeys.map((fk) => (
                  <li key={fk} className="flex items-start gap-2 text-sm text-landing-soft">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" aria-hidden />
                    {tx(fk)}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href={`/signup?plan=${plan.stripePlanKey}`}
                  className={`group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform duration-rw hover:scale-[1.02] ${
                    plan.recommended
                      ? "bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink text-white shadow-landing-card"
                      : "border border-landing-line bg-white/5 text-landing-ink hover:border-landing-magenta/60 hover:bg-white/10"
                  }`}
                >
                  {copy.ctaStart}
                  <ArrowRight className="h-4 w-4 transition-transform duration-rw group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <a
                  href={demoHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-transparent px-5 py-2.5 text-xs font-semibold text-landing-soft transition-all duration-rw hover:border-landing-magenta/40 hover:text-landing-ink"
                >
                  {copy.ctaDemo}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
