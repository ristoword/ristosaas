import { Check } from "lucide-react";

const BENEFITS = [
  {
    title: "Ordini live",
    body: "Zero doppi passaggi tra sala e cucina. Tutto tracciato, tutto aggiornato in tempo reale.",
  },
  {
    title: "Sala, tavoli, servizio",
    body: "Pianta tavoli, assegnazioni, modifiche al volo. Grande e leggibile, anche a mani impegnate.",
  },
  {
    title: "Prenotazioni e hospitality",
    body: "Check-in e check-out fluidi. Folio unico per chi è ospite del ristorante e dell&apos;hotel.",
  },
  {
    title: "Pagamenti integrati",
    body: "Stripe nativo. Ricevute, abbonamenti e licenze senza uscire dalla piattaforma.",
  },
  {
    title: "Desktop e mobile",
    body: "Stesse funzioni su ogni schermo. Proprietario, maitre, cameriere: ognuno ha il suo spazio.",
  },
  {
    title: "Multi-tenant sicuro",
    body: "Più strutture, stessa piattaforma. RBAC granulare, audit trail e isolamento dei dati.",
  },
];

export function BenefitsSection() {
  return (
    <section id="vantaggi" className="relative py-24 md:py-32">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
            Vantaggi
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
            Gestione totale, senza stress.
          </h2>
          <p className="mt-4 text-landing-soft">
            Pensato per ristoranti con hotel. Pensato per hotel con ristorante. Pensato per chi non ha tempo da perdere.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <article
              key={b.title}
              className="group relative overflow-hidden rounded-3xl border border-landing-line bg-landing-card p-6 transition-all duration-rw hover:-translate-y-0.5 hover:border-landing-magenta/40"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-landing-violet to-landing-magenta text-white shadow-landing-soft">
                <Check className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-landing-ink">{b.title}</h3>
              <p
                className="mt-2 text-sm leading-relaxed text-landing-soft"
                dangerouslySetInnerHTML={{ __html: b.body }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
