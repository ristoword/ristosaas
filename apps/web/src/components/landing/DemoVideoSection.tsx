import { Play } from "lucide-react";

/**
 * Demo video section — placed right below the hero.
 * The video is served from /landing/demo.webm (public folder).
 */
export function DemoVideoSection() {
  return (
    <section className="relative py-16 md:py-24">
      {/* Subtle background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-landing-magenta/40 to-transparent"
      />

      <div className="mx-auto w-full max-w-5xl px-5 md:px-8">
        {/* Section heading */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-landing-line bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-soft">
            <Play className="h-3 w-3 text-landing-magentaSoft" aria-hidden />
            Video demo
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-landing-ink sm:text-3xl md:text-4xl">
            Scopri il gestionale in azione
          </h2>
          <p className="mt-3 text-base text-landing-soft">
            Dashboard, sala, cucina, hotel, magazzino e molto altro — tutto in un unico sistema.
          </p>
        </div>

        {/* Video player */}
        <div className="relative overflow-hidden rounded-2xl border border-landing-line shadow-landing-card">
          {/* Gradient frame */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-white/10"
          />
          <video
            src="/landing/demo.webm"
            autoPlay
            muted
            loop
            playsInline
            controls
            className="w-full"
            style={{ display: "block", maxHeight: "640px" }}
          >
            Il tuo browser non supporta la riproduzione video.
          </video>
        </div>

        {/* Caption */}
        <p className="mt-4 text-center text-xs text-landing-muted">
          Tour completo: dashboard · sala · cucina · cassa · hotel · magazzino · staff
        </p>
      </div>
    </section>
  );
}
