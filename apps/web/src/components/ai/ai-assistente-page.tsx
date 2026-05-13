"use client";

import { useState } from "react";
import {
  Bot,
  ChefHat,
  CreditCard,
  Package,
  BarChart3,
  BedDouble,
  ClipboardList,
  Pizza,
  Wine,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { AiChat } from "@/components/ai/ai-chat";

type AiDepartment = {
  id: string;
  context: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
  capabilities: string[];
};

const departments: AiDepartment[] = [
  {
    id: "cucina",
    context: "cucina",
    label: "Cucina",
    icon: ChefHat,
    color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    description: "Assistente operativo per la cucina con dati reali dal magazzino.",
    capabilities: [
      "Priorità comande e gestione corsi",
      "Tempi di servizio e ottimizzazione flusso",
      "Controllo allergeni e intolleranze",
      "Food cost e margini per piatto",
      "Piatti consigliati in base allo stock",
      "Prep list e mise en place",
      "Azioni riordino urgenti",
      "Smaltimento sovra-scorte",
    ],
  },
  {
    id: "cassa",
    context: "cassa",
    label: "Cassa",
    icon: CreditCard,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    description: "Supporto per operazioni di cassa e pagamenti.",
    capabilities: [
      "Chiusure conto e riconciliazione",
      "Gestione pagamenti e metodi",
      "Storni e rettifiche",
      "Eccezioni cassa e discrepanze",
      "Room-charge e addebiti camera",
      "Split conto e pagamenti parziali",
    ],
  },
  {
    id: "magazzino",
    context: "magazzino",
    label: "Magazzino",
    icon: Package,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    description: "Gestione intelligente dell'inventario e dei riordini.",
    capabilities: [
      "Stato inventario e scorte minime",
      "Lotti in scadenza e azioni FIFO",
      "Movimenti carico/scarico",
      "Suggerimenti riordino fornitori",
      "Prodotti stagnanti da smaltire",
      "Food cost ingredienti",
    ],
  },
  {
    id: "supervisor",
    context: "supervisor",
    label: "Supervisor",
    icon: BarChart3,
    color: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    description: "Analisi manageriale con KPI e raccomandazioni operative.",
    capabilities: [
      "KPI giornalieri e trend",
      "Analisi margini e food cost",
      "Efficienza staff e turni",
      "Report operativi automatici",
      "Raccomandazioni strategiche",
      "Confronto periodi e stagionalità",
    ],
  },
  {
    id: "hotel",
    context: "hotel",
    label: "Hotel",
    icon: BedDouble,
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    description: "Supporto per front desk e gestione alberghiera.",
    capabilities: [
      "Check-in e check-out",
      "Occupazione camere e disponibilità",
      "Gestione folio ospite",
      "Keycard e serrature",
      "Housekeeping e stato pulizie",
      "Pagamenti soggiorno e addebiti",
    ],
  },
  {
    id: "prenotazioni",
    context: "prenotazioni",
    label: "Prenotazioni",
    icon: ClipboardList,
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    description: "Analisi clienti, allergie e gestione prenotazioni.",
    capabilities: [
      "Verifica clienti abituali e VIP",
      "Controllo allergeni e intolleranze",
      "Richieste specifiche e abitudini",
      "Preferenze tavolo e sala",
      "Gestione disponibilità e conferme",
      "Storico visite e spesa media",
    ],
  },
  {
    id: "pizzeria",
    context: "pizzeria",
    label: "Pizzeria",
    icon: Pizza,
    color: "text-red-400 bg-red-400/10 border-red-400/20",
    description: "Assistente per la linea pizze e gestione impasti.",
    capabilities: [
      "Comande pizze e priorità forno",
      "Gestione impasti e lievitazione",
      "Tempi forno e rotazione",
      "Varianti e personalizzazioni",
      "Flusso ordini e tempistiche",
    ],
  },
  {
    id: "bar",
    context: "bar",
    label: "Bar",
    icon: Wine,
    color: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    description: "Supporto per il servizio al bancone e bevande.",
    capabilities: [
      "Comande bevande e cocktail",
      "Servizio al bancone",
      "Gestione scorte drink",
      "Tempistiche servizio",
      "Abbinamenti e suggerimenti",
    ],
  },
];

export function AiAssistentePage() {
  const [activeContext, setActiveContext] = useState<string | null>(null);
  const activeDept = departments.find((d) => d.context === activeContext);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistente"
        subtitle="Seleziona un reparto per iniziare una conversazione con l'assistente AI specializzato."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {departments.map((dept) => {
          const Icon = dept.icon;
          return (
            <Card key={dept.id} className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-rw-accent/5">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${dept.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-rw-ink">{dept.label}</h3>
                    <p className="text-xs text-rw-muted mt-0.5">{dept.description}</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  {dept.capabilities.map((cap) => (
                    <div key={cap} className="flex items-start gap-2 text-xs text-rw-soft">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rw-accent/60" />
                      {cap}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveContext(dept.context)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2.5 text-sm font-semibold text-rw-accent transition hover:bg-rw-accent/20"
                >
                  <Sparkles className="h-4 w-4" />
                  Chiedi all&apos;AI
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {activeContext && (
        <div className="rounded-2xl border border-rw-line bg-rw-surface/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-5 w-5 text-rw-accent" />
            <span className="text-sm font-semibold text-rw-ink">
              Esempi di domande — {activeDept?.label}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {getExampleQuestions(activeContext).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setActiveContext(activeContext)}
                className="rounded-xl border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2 text-left text-xs text-rw-soft transition hover:border-rw-accent/30 hover:text-rw-ink"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}

      <AiChat
        context={activeContext || "default"}
        open={activeContext !== null}
        onClose={() => setActiveContext(null)}
        title={activeDept ? `AI ${activeDept.label}` : "AI Assistant"}
      />
    </div>
  );
}

function getExampleQuestions(context: string): string[] {
  const examples: Record<string, string[]> = {
    cucina: [
      "Quali piatti posso preparare con lo stock attuale?",
      "Qual è il food cost della carbonara oggi?",
      "Ci sono allergeni nelle comande attive?",
      "Dammi la prep list per il servizio di stasera",
      "Quali ingredienti devo riordinare con urgenza?",
      "Suggeriscimi il menu del giorno basato sulle scorte",
    ],
    cassa: [
      "Come faccio uno storno parziale?",
      "Riconcilia i pagamenti della serata",
      "Come addebito un conto in camera?",
      "Spiega le eccezioni cassa di oggi",
      "Come gestisco un pagamento split?",
      "Qual è il totale incassi del turno?",
    ],
    magazzino: [
      "Quali prodotti sono sotto scorta minima?",
      "Ci sono lotti in scadenza questa settimana?",
      "Quanto ho consumato di farina negli ultimi 14 giorni?",
      "Suggerisci un ordine per il fornitore Molino Rossi",
      "Quali prodotti sono fermi da più di 10 giorni?",
      "Calcola il valore totale dell'inventario",
    ],
    supervisor: [
      "Qual è il margine medio di oggi?",
      "Quali piatti stanno perdendo soldi?",
      "Dammi un report operativo della settimana",
      "Come sta andando il food cost vs target?",
      "Quali piatti dovrei togliere dal menu?",
      "Analizza l'efficienza del turno di stasera",
    ],
    hotel: [
      "Quante camere sono libere stanotte?",
      "Check-in previsti per domani?",
      "Stato housekeeping delle camere",
      "Ospiti con mezza pensione attiva?",
      "Problemi aperti con le keycard?",
      "Riepilogo folio ospite camera 101",
    ],
    prenotazioni: [
      "Il cliente Rossi ha allergie registrate?",
      "Quante prenotazioni ci sono per sabato sera?",
      "Chi sono i clienti abituali di questa settimana?",
      "Ci sono richieste speciali per stasera?",
      "Quale tavolo preferisce il signor Bianchi?",
      "Quali clienti VIP hanno prenotato?",
    ],
    pizzeria: [
      "Quante pizze sono in coda?",
      "Tempi medi del forno oggi?",
      "Quali varianti sono state più richieste?",
      "Stato degli impasti per domani?",
      "Ottimizza il flusso ordini pizze",
    ],
    bar: [
      "Cocktail più venduti questa settimana?",
      "Scorte critiche per il servizio serale?",
      "Tempi medi di servizio al bancone?",
      "Suggerimenti per drink della serata?",
      "Quali drink abbinare al menu del giorno?",
    ],
  };
  return examples[context] || [];
}
