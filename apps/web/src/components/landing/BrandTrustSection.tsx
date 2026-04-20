export function BrandTrustSection() {
  return (
    <section id="brand" className="relative py-20 md:py-28">
      <div className="mx-auto w-full max-w-5xl px-5 md:px-8">
        <div className="relative overflow-hidden rounded-[36px] border border-landing-line bg-landing-card p-10 text-center md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-landing-hero opacity-80"
          />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-landing-magentaSoft">
              Trust
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl">
              Una soluzione firmata{" "}
              <a
                href="https://gestionesemplificata.com"
                target="_blank"
                rel="noreferrer"
                className="bg-gradient-to-r from-landing-violetSoft via-landing-magentaSoft to-landing-pink bg-clip-text text-transparent underline decoration-landing-magenta/30 decoration-2 underline-offset-8 transition-opacity hover:opacity-90"
              >
                gestionesemplificata.com
              </a>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-landing-soft">
              Dietro RistoSaaS c&apos;è un team che progetta software gestionale da anni.
              Stessa filosofia, stessa cura — applicata al mondo dell&apos;hospitality.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
