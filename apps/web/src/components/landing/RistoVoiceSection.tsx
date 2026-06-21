import Image from "next/image";
import { Mic, ChefHat, Package, Wine, ClipboardList, BarChart3 } from "lucide-react";
import type { Locale } from "@/core/i18n/types";

const COPY: Record<Locale, {
  eyebrow: string;
  title: string;
  subtitle: string;
  caption: string;
  capabilities: { icon: string; label: string; desc: string }[];
  examples: string[];
}> = {
  it: {
    eyebrow: "AI Voice Assistant",
    title: "Parla con il tuo ristorante",
    subtitle: "Dì \"Risto, crea una ricetta\" o \"Risto, carica questa bolla\" e l'AI esegue l'azione nel gestionale. Voce o testo, ogni reparto.",
    caption: "Risto capisce comandi in linguaggio naturale e li trasforma in azioni reali nel sistema.",
    capabilities: [
      { icon: "chef", label: "Ricette", desc: "Crea ricette con ingredienti, dosi e passaggi" },
      { icon: "package", label: "Magazzino", desc: "Carica bolle, aggiorna scorte, riordina" },
      { icon: "wine", label: "Cantina", desc: "Aggiungi vini, aggiorna bottiglie" },
      { icon: "clipboard", label: "Ordini", desc: "Prepara liste ordine fornitore" },
      { icon: "chart", label: "Report", desc: "Riepilogo giornaliero completo" },
    ],
    examples: [
      "Risto crea una ricetta per la carbonara",
      "Risto segna 10 kg di filetto",
      "Risto aggiungi un Barolo 2018",
      "Risto come stiamo oggi?",
    ],
  },
  en: {
    eyebrow: "AI Voice Assistant",
    title: "Talk to your restaurant",
    subtitle: "Say \"Risto, create a recipe\" or \"Risto, load this delivery\" and the AI executes the action in the system. Voice or text, every department.",
    caption: "Risto understands natural language commands and turns them into real actions in the system.",
    capabilities: [
      { icon: "chef", label: "Recipes", desc: "Create recipes with ingredients, doses and steps" },
      { icon: "package", label: "Warehouse", desc: "Load deliveries, update stock, reorder" },
      { icon: "wine", label: "Wine Cellar", desc: "Add wines, update bottle stock" },
      { icon: "clipboard", label: "Orders", desc: "Prepare supplier order lists" },
      { icon: "chart", label: "Reports", desc: "Complete daily summary" },
    ],
    examples: [
      "Risto create a carbonara recipe",
      "Risto add 10 kg of fillet",
      "Risto add a 2018 Barolo",
      "Risto how are we doing today?",
    ],
  },
  nl: {
    eyebrow: "AI Spraakassistent",
    title: "Praat met je restaurant",
    subtitle: "Zeg \"Risto, maak een recept\" of \"Risto, laad deze levering\" en de AI voert de actie uit in het systeem. Spraak of tekst, elke afdeling.",
    caption: "Risto begrijpt natuurlijke taalcommando's en zet ze om in echte acties in het systeem.",
    capabilities: [
      { icon: "chef", label: "Recepten", desc: "Maak recepten met ingrediënten, doses en stappen" },
      { icon: "package", label: "Magazijn", desc: "Laad leveringen, werk voorraad bij, herbestel" },
      { icon: "wine", label: "Wijnkelder", desc: "Voeg wijnen toe, werk flessenvoorraad bij" },
      { icon: "clipboard", label: "Bestellingen", desc: "Bereid leveranciersbestellijsten voor" },
      { icon: "chart", label: "Rapporten", desc: "Volledig dagelijks overzicht" },
    ],
    examples: [
      "Risto maak een carbonara recept",
      "Risto voeg 10 kg filet toe",
      "Risto voeg een 2018 Barolo toe",
      "Risto hoe gaat het vandaag?",
    ],
  },
  pt: {
    eyebrow: "Assistente de Voz IA",
    title: "Fale com o seu restaurante",
    subtitle: "Diga \"Risto, crie uma receita\" ou \"Risto, carregue esta entrega\" e a IA executa a ação no sistema. Voz ou texto, cada departamento.",
    caption: "Risto entende comandos em linguagem natural e os transforma em ações reais no sistema.",
    capabilities: [
      { icon: "chef", label: "Receitas", desc: "Crie receitas com ingredientes, doses e etapas" },
      { icon: "package", label: "Estoque", desc: "Carregue entregas, atualize estoque, reordene" },
      { icon: "wine", label: "Adega", desc: "Adicione vinhos, atualize estoque de garrafas" },
      { icon: "clipboard", label: "Pedidos", desc: "Prepare listas de pedidos ao fornecedor" },
      { icon: "chart", label: "Relatórios", desc: "Resumo diário completo" },
    ],
    examples: [
      "Risto crie uma receita de carbonara",
      "Risto adicione 10 kg de filé",
      "Risto adicione um Barolo 2018",
      "Risto como estamos hoje?",
    ],
  },
};

const ICON_MAP: Record<string, React.ElementType> = {
  chef: ChefHat,
  package: Package,
  wine: Wine,
  clipboard: ClipboardList,
  chart: BarChart3,
};

export function RistoVoiceSection({ locale = "it" }: { locale?: Locale }) {
  const t = COPY[locale] ?? COPY.it;

  return (
    <section className="relative py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-landing-violet/40 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-landing-violet/15 blur-[120px]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 md:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-landing-line bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-landing-soft">
            <Mic className="h-3.5 w-3.5 text-landing-magentaSoft" aria-hidden />
            {t.eyebrow}
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-landing-ink sm:text-4xl md:text-5xl">
            {t.title}
          </h2>
          <p className="mt-4 text-base text-landing-soft sm:text-lg">
            {t.subtitle}
          </p>
        </div>

        {/* Content: Screenshot + Capabilities */}
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-12 items-center">
          {/* Screenshot — takes 3 cols */}
          <div className="lg:col-span-3">
            <div className="relative overflow-hidden rounded-2xl border border-landing-line shadow-landing-card">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-white/10"
              />
              <Image
                src="/landing/risto-comandi-preview.png"
                alt="Risto Comandi - AI Voice Assistant Interface"
                width={1200}
                height={750}
                className="w-full h-auto"
                priority={false}
              />
            </div>
            <p className="mt-3 text-center text-xs text-landing-muted">
              {t.caption}
            </p>
          </div>

          {/* Capabilities + Examples — takes 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Capabilities */}
            <div className="space-y-3">
              {t.capabilities.map((cap) => {
                const Icon = ICON_MAP[cap.icon] || Mic;
                return (
                  <div
                    key={cap.label}
                    className="flex items-start gap-3 rounded-2xl border border-landing-line bg-landing-card p-4 transition-all duration-rw hover:border-landing-magenta/30"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-landing-violet to-landing-magenta text-white">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-landing-ink">{cap.label}</p>
                      <p className="mt-0.5 text-xs text-landing-soft">{cap.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Example commands */}
            <div className="rounded-2xl border border-landing-magenta/20 bg-landing-magenta/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mic className="h-4 w-4 text-landing-magentaSoft" />
                <span className="text-xs font-semibold text-landing-magentaSoft uppercase tracking-wider">
                  {locale === "it" ? "Comandi esempio" : locale === "en" ? "Example commands" : locale === "nl" ? "Voorbeeldcommando's" : "Comandos exemplo"}
                </span>
              </div>
              <div className="space-y-2">
                {t.examples.map((ex) => (
                  <p key={ex} className="text-sm text-landing-soft italic">
                    &ldquo;{ex}&rdquo;
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
