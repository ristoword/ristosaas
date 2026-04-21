import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BedDouble, ChefHat, CreditCard, Package, UtensilsCrossed } from "lucide-react";
import { SeoPageShell } from "@/components/landing/SeoPageShell";
import { SoftwareApplicationJsonLd } from "@/components/landing/SoftwareApplicationJsonLd";

export const metadata: Metadata = {
  title: "Gestionale Ristorante e Hotel Integrato | Software Unico Horeca",
  description:
    "Software gestionale per ristorante e hotel: ordini, cucina, camere e magazzino in un unico sistema integrato.",
  keywords: [
    "gestionale ristorante e hotel integrato",
    "software unico horeca",
    "gestionale ristorante hotel",
    "addebito ristorante camera",
    "folio unico ospite",
    "magazzino ristorante automatico",
  ],
  alternates: { canonical: "/gestionale-ristorante-hotel-integrato" },
  openGraph: {
    title: "Gestionale Ristorante e Hotel Integrato | Software Unico Horeca",
    description:
      "Ordini, cucina, camere e magazzino in un unico sistema. Addebito ristorante su camera, folio unico ospite, scarico magazzino automatico.",
    type: "article",
    locale: "it_IT",
  },
};

export default function GestionaleIntegratoPage() {
  return (
    <SeoPageShell>
      <SoftwareApplicationJsonLd
        name="RistoSaaS - Gestionale Ristorante e Hotel Integrato"
        url="https://ristosaas.com/gestionale-ristorante-hotel-integrato"
        description="Software gestionale per ristorante e hotel: ordini, cucina, camere e magazzino in un unico sistema integrato."
      />

      <section className="relative mx-auto w-full max-w-5xl px-5 pb-16 pt-8 md:px-8 md:pb-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
          Pillar · Sistema integrato
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-landing-ink sm:text-4xl md:text-5xl lg:text-6xl">
          Software gestionale ristorante e hotel integrato
        </h1>
        <p className="mt-6 max-w-3xl text-base text-landing-soft md:text-lg">
          Un unico sistema per gestire ristorante e hotel elimina errori, doppie registrazioni e
          perdita di tempo. Tutto è collegato: dalla sala alla cucina, fino alle camere.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="mailto:hello@gestionesemplificata.com?subject=RistoSaaS%20%E2%80%93%20Richiesta%20demo&body=Vorrei%20una%20demo%20del%20gestionale%20integrato%20RistoSaaS."
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-7 py-3.5 text-sm font-semibold text-white shadow-landing-card transition-transform duration-rw hover:scale-[1.02]"
          >
            Richiedi demo
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-white/5 px-7 py-3.5 text-sm font-semibold text-landing-ink transition-all duration-rw hover:border-landing-magenta/60 hover:bg-white/10"
          >
            Prova accesso
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          Come funziona l&apos;integrazione
        </h2>
        <p className="mt-4 max-w-3xl text-landing-soft">
          Ogni azione in un modulo aggiorna automaticamente gli altri. Nessun passaggio manuale.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-violet to-landing-magenta text-white">
              <UtensilsCrossed className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Ristorante <span className="text-landing-magentaSoft">→</span> Hotel
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-landing-soft">
              Il cliente mangia al ristorante e il conto viene caricato direttamente sulla camera.
              Un solo folio al check-out, con voci hotel e ristorante unificate.
            </p>
          </article>

          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-magenta to-landing-pink text-white">
              <ChefHat className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Cucina <span className="text-landing-magentaSoft">→</span> Magazzino
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-landing-soft">
              Ogni piatto preparato aggiorna automaticamente le scorte. Niente conteggi manuali,
              niente inventari bloccati il lunedì mattina.
            </p>
          </article>

          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-violet to-landing-magentaSoft text-white">
              <Package className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Magazzino <span className="text-landing-magentaSoft">→</span> Fornitori
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-landing-soft">
              Quando le scorte scendono sotto soglia, il sistema suggerisce un ordine fornitore
              con quantità consigliate e invia PDF via email.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          Funzionalità principali
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-violet to-landing-magenta text-white">
              <UtensilsCrossed className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Gestione ristorante
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-landing-soft">
              <li>• Tavoli e planimetria sala</li>
              <li>• Ordini collegati alla cucina</li>
              <li>• Cucina (KDS) con stato corsi</li>
              <li>• Cassa e chiusura conto</li>
            </ul>
          </article>

          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-magenta to-landing-pink text-white">
              <BedDouble className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Gestione hotel
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-landing-soft">
              <li>• Prenotazioni</li>
              <li>• Camere e availability</li>
              <li>• Folio cliente unificato</li>
              <li>• Check-in / check-out</li>
            </ul>
          </article>

          <article className="rounded-3xl border border-landing-line bg-landing-card p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-violet to-landing-magentaSoft text-white">
              <Package className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">
              Magazzino
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-landing-soft">
              <li>• Scorte e alert sotto soglia</li>
              <li>• Ordini fornitori</li>
              <li>• Ricezione merce con carico automatico</li>
              <li>• Report acquisti</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          Per chi è
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          <li className="rounded-2xl border border-landing-line bg-landing-card p-5 text-sm text-landing-soft">
            <strong className="block text-base text-landing-ink">Ristoranti con hotel</strong>
            Ristoranti che offrono anche ospitalità e devono gestire folio unico e camera charge.
          </li>
          <li className="rounded-2xl border border-landing-line bg-landing-card p-5 text-sm text-landing-soft">
            <strong className="block text-base text-landing-ink">Hotel con ristorante interno</strong>
            Hotel con sala ristorante, colazione, mezza pensione o pensione completa.
          </li>
          <li className="rounded-2xl border border-landing-line bg-landing-card p-5 text-sm text-landing-soft">
            <strong className="block text-base text-landing-ink">Strutture horeca complete</strong>
            Agriturismi, resort, country house con più punti vendita interni.
          </li>
        </ul>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
          Vantaggi concreti
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Meno errori operativi", body: "Zero trascrizioni manuali tra moduli." },
            { title: "Meno software da gestire", body: "Un solo sistema, una sola licenza." },
            { title: "Maggiore controllo", body: "Dati in tempo reale, accessibili ovunque." },
            { title: "Dati centralizzati", body: "Multi-tenant, backup, audit trail." },
          ].map((v) => (
            <article
              key={v.title}
              className="rounded-2xl border border-landing-line bg-landing-card p-5"
            >
              <h3 className="font-display text-lg font-semibold text-landing-ink">{v.title}</h3>
              <p className="mt-2 text-sm text-landing-soft">{v.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 pb-24 md:px-8">
        <div className="rounded-[32px] border border-landing-magenta/30 bg-landing-card p-10 text-center shadow-landing-soft md:p-14">
          <h2 className="font-display text-2xl font-semibold text-landing-ink sm:text-3xl md:text-4xl">
            Richiedi una demo e vedi come funziona dal vivo
          </h2>
          <p className="mt-4 text-landing-soft">
            Ti mostriamo il flusso completo in 20 minuti: ordine in sala, KDS in cucina,
            scarico magazzino, addebito su camera, check-out con folio unico.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="mailto:hello@gestionesemplificata.com?subject=RistoSaaS%20%E2%80%93%20Richiesta%20demo&body=Vorrei%20una%20demo%20del%20gestionale%20integrato%20RistoSaaS."
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-landing-violet via-landing-magenta to-landing-pink px-7 py-3.5 text-sm font-semibold text-white shadow-landing-card"
            >
              Richiedi demo <CreditCard className="h-4 w-4" aria-hidden />
            </a>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-landing-line bg-white/5 px-7 py-3.5 text-sm font-semibold text-landing-ink"
            >
              Prova accesso
            </Link>
          </div>
        </div>
      </section>
    </SeoPageShell>
  );
}
