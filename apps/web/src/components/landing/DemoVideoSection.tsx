import { Play } from "lucide-react";
import type { Locale } from "@/core/i18n/types";

const COPY: Record<Locale, { badge: string; title: string; subtitle: string; caption: string; fallback: string }> = {
  it: {
    badge: "Video demo",
    title: "Scopri il gestionale in azione",
    subtitle: "Dashboard, sala, cucina, hotel, magazzino e molto altro — tutto in un unico sistema.",
    caption: "Tour completo: dashboard · sala · cucina · cassa · hotel · magazzino · staff",
    fallback: "Il tuo browser non supporta la riproduzione video.",
  },
  en: {
    badge: "Demo video",
    title: "See the platform in action",
    subtitle: "Dashboard, dining room, kitchen, hotel, warehouse and more — all in one system.",
    caption: "Full tour: dashboard · dining · kitchen · POS · hotel · warehouse · staff",
    fallback: "Your browser does not support video playback.",
  },
  nl: {
    badge: "Demovideo",
    title: "Bekijk het platform in actie",
    subtitle: "Dashboard, zaal, keuken, hotel, magazijn en meer — alles in één systeem.",
    caption: "Volledige tour: dashboard · zaal · keuken · kassa · hotel · magazijn · personeel",
    fallback: "Uw browser ondersteunt geen videoweergave.",
  },
  pt: {
    badge: "Vídeo demo",
    title: "Veja a plataforma em ação",
    subtitle: "Dashboard, salão, cozinha, hotel, estoque e muito mais — tudo em um único sistema.",
    caption: "Tour completo: dashboard · salão · cozinha · caixa · hotel · estoque · equipe",
    fallback: "Seu navegador não suporta a reprodução de vídeo.",
  },
};

export function DemoVideoSection({ locale = "it" }: { locale?: Locale }) {
  const t = COPY[locale] ?? COPY.it;

  return (
    <section className="relative py-16 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-landing-magenta/40 to-transparent"
      />

      <div className="mx-auto w-full max-w-5xl px-5 md:px-8">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-landing-line bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-soft">
            <Play className="h-3 w-3 text-landing-magentaSoft" aria-hidden />
            {t.badge}
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-landing-ink sm:text-3xl md:text-4xl">
            {t.title}
          </h2>
          <p className="mt-3 text-base text-landing-soft">
            {t.subtitle}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-landing-line shadow-landing-card">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-white/10"
          />
          <video
            src="/landing/demo-full.webm"
            autoPlay
            muted
            loop
            playsInline
            controls
            className="w-full"
            style={{ display: "block", maxHeight: "640px" }}
          >
            {t.fallback}
          </video>
        </div>

        <p className="mt-4 text-center text-xs text-landing-muted">
          {t.caption}
        </p>
      </div>
    </section>
  );
}
