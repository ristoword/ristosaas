import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChefHat, ClipboardList, Package, UtensilsCrossed } from "lucide-react";
import { SeoPageShell } from "@/components/landing/SeoPageShell";
import { SoftwareApplicationJsonLd } from "@/components/landing/SoftwareApplicationJsonLd";

export const metadata: Metadata = {
  title: "Gestionale Ristorante Cloud | Ordini, Cucina, Magazzino",
  description:
    "Software gestionale per ristorante: tavoli, ordini collegati alla cucina, stato piatti e integrazione magazzino. Cloud, multi-device, in un unico sistema.",
  keywords: [
    "gestionale ristorante",
    "gestionale ristorante cloud",
    "software cucina KDS",
    "gestione tavoli ristorante",
    "ordini sala cucina",
  ],
  alternates: { canonical: "/gestionale-ristorante" },
  openGraph: {
    title: "Gestionale Ristorante Cloud | Ordini, Cucina, Magazzino",
    description:
      "Tavoli, ordini, cucina e magazzino collegati in tempo reale in un unico sistema gestionale cloud.",
    type: "article",
    locale: "it_IT",
  },
};

export default function GestionaleRistorantePage() {
  return (
    <SeoPageShell>
      <SoftwareApplicationJsonLd
        name="RistoSaaS - Gestionale Ristorante Cloud"
        url="https://ristosaas.com/gestionale-ristorante"
        description="Software gestionale per ristorante cloud: ordini, cucina (KDS), magazzino e chiusura conto in un unico sistema."
      />

      <section className="relative mx-auto w-full max-w-5xl px-5 pb-16 pt-8 md:px-8 md:pb-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
          Ristorante
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-landing-ink sm:text-4xl md:text-5xl lg:text-6xl">
          Software gestionale per ristorante
        </h1>
        <p className="mt-6 max-w-3xl text-base text-landing-soft md:text-lg">
          Dalla presa comanda al conto chiuso: tutto collegato, tutto tracciato. Sala, cucina
          e magazzino parlano la stessa lingua in tempo reale.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="mailto:hello@gestionesemplificata.com?subject=RistoSaaS%20%E2%80%93%20Demo%20ristorante&body=Vorrei%20una%20demo%20del%20gestionale%20ristorante."
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-7 py-3.5 text-sm font-semibold text-white shadow-landing-card hover:scale-[1.02] transition-transform"
          >
            Richiedi demo
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-white/5 px-7 py-3.5 text-sm font-semibold text-landing-ink hover:border-landing-magenta/60 hover:bg-white/10 transition-all"
          >
            Prova accesso
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          Cosa include il gestionale ristorante
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-violet to-landing-magenta text-white">
              <UtensilsCrossed className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Gestione tavoli
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-landing-soft">
              Planimetria sala touch con drag &amp; drop dei tavoli, stati colorati (libero,
              aperto, conto, da pulire), coperti e ordine corrente visibile a colpo d&apos;occhio.
            </p>
          </article>

          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-magenta to-landing-pink text-white">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Ordini <span className="text-landing-magentaSoft">→</span> cucina
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-landing-soft">
              La comanda presa al tavolo arriva direttamente al KDS della cucina, suddivisa
              per corso e destinazione (cucina, pizzeria, bar). Nessuna carta, nessun fax.
            </p>
          </article>

          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-violet to-landing-magentaSoft text-white">
              <ChefHat className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Stato piatti
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-landing-soft">
              In preparazione, pronto, servito. Ogni transizione è tracciata e visibile sia
              in cucina che in sala, con tempo di attesa per corso.
            </p>
          </article>

          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-pink to-landing-violet text-white">
              <Package className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Integrazione magazzino
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-landing-soft">
              Ogni piatto servito scarica automaticamente gli ingredienti dal magazzino secondo
              la ricetta. Scorte aggiornate senza un solo click manuale.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <div className="rounded-[32px] border border-landing-line bg-landing-card p-10 md:p-14">
          <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl">
            Cerchi un sistema unico per ristorante e hotel?
          </h2>
          <p className="mt-3 text-landing-soft">
            Scopri il gestionale integrato con addebito ristorante su camera e folio unico
            ospite, pensato per strutture horeca complete.
          </p>
          <div className="mt-6">
            <Link
              href="/gestionale-ristorante-hotel-integrato"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-6 py-3 text-sm font-semibold text-white"
            >
              Scopri il sistema integrato
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </SeoPageShell>
  );
}
