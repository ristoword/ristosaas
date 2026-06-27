"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { AiChat } from "@/components/ai/ai-chat";
import { AiAssistenteOps } from "@/components/ai/ai-assistente-ops";

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
    ],
  },
  {
    id: "cassa",
    context: "cassa",
    label: "Cassa",
    icon: CreditCard,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    description: "Supporto per operazioni di cassa e pagamenti.",
    capabilities: ["Chiusure conto", "Storni e rettifiche", "Eccezioni cassa"],
  },
  {
    id: "magazzino",
    context: "magazzino",
    label: "Magazzino",
    icon: Package,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    description: "Gestione intelligente dell'inventario e dei riordini.",
    capabilities: ["Stato inventario", "Lotti in scadenza", "Suggerimenti riordino"],
  },
  {
    id: "supervisor",
    context: "supervisor",
    label: "Supervisor",
    icon: BarChart3,
    color: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    description: "Analisi manageriale con KPI e raccomandazioni operative.",
    capabilities: ["KPI giornalieri", "Food cost", "Report operativi"],
  },
  {
    id: "hotel",
    context: "hotel",
    label: "Hotel",
    icon: BedDouble,
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    description: "Supporto per front desk e gestione alberghiera.",
    capabilities: ["Check-in/out", "Occupazione", "Housekeeping"],
  },
  {
    id: "prenotazioni",
    context: "prenotazioni",
    label: "Prenotazioni",
    icon: ClipboardList,
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    description: "Analisi clienti, allergie e gestione prenotazioni.",
    capabilities: ["Clienti VIP", "Allergie", "Disponibilità"],
  },
  {
    id: "pizzeria",
    context: "pizzeria",
    label: "Pizzeria",
    icon: Pizza,
    color: "text-red-400 bg-red-400/10 border-red-400/20",
    description: "Assistente per la linea pizze e gestione impasti.",
    capabilities: ["Comande pizze", "Impasti", "Tempi forno"],
  },
  {
    id: "bar",
    context: "bar",
    label: "Bar",
    icon: Wine,
    color: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    description: "Supporto per il servizio al bancone e bevande.",
    capabilities: ["Cocktail", "Scorte drink", "Abbinamenti"],
  },
];

export function AiAssistentePage() {
  const searchParams = useSearchParams();
  const initialContext = searchParams.get("context");
  const [activeContext, setActiveContext] = useState<string | null>(null);
  const [showDepartments, setShowDepartments] = useState(false);

  useEffect(() => {
    if (initialContext) setActiveContext(initialContext);
  }, [initialContext]);
  const activeDept = useMemo(
    () => departments.find((d) => d.context === activeContext),
    [activeContext],
  );

  const openChat = useCallback((context: string) => {
    setActiveContext(context);
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="AI Assistente"
        subtitle="Centro operativo AI: stato, azioni rapide, automazioni, decisioni e chat specializzata per reparto."
      />

      <AiAssistenteOps onOpenChat={openChat} />

      <Card
        title="Reparti AI"
        headerRight={
          <button
            type="button"
            onClick={() => setShowDepartments((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rw-accent"
          >
            {showDepartments ? (
              <>
                Nascondi <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Mostra chat reparti <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        }
      >
        {showDepartments && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {departments.map((dept) => {
                const Icon = dept.icon;
                return (
                  <div
                    key={dept.id}
                    className="group relative overflow-hidden rounded-2xl border border-rw-line bg-rw-surfaceAlt transition hover:border-rw-accent/30"
                  >
                    <div className="p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${dept.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-display text-sm font-semibold text-rw-ink">{dept.label}</h3>
                          <p className="mt-0.5 text-xs text-rw-muted">{dept.description}</p>
                        </div>
                      </div>
                      <ul className="mb-3 space-y-1 text-xs text-rw-soft">
                        {dept.capabilities.map((cap) => (
                          <li key={cap}>• {cap}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setActiveContext(dept.context)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2.5 text-sm font-semibold text-rw-accent transition hover:bg-rw-accent/20"
                      >
                        <Sparkles className="h-4 w-4" />
                        Chiedi all&apos;AI
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {activeContext && (
              <div className="mt-4 rounded-2xl border border-rw-line bg-rw-surface/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Bot className="h-5 w-5 text-rw-accent" />
                  <span className="text-sm font-semibold text-rw-ink">
                    Esempi — {activeDept?.label}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {getExampleQuestions(activeContext).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setActiveContext(activeContext)}
                      className="rounded-xl border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2 text-left text-xs text-rw-soft transition hover:border-rw-accent/30 hover:text-rw-ink"
                      title="Apri chat e inserisci questa domanda"
                    >
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

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
      "Dammi la prep list per il servizio di stasera",
    ],
    cassa: [
      "Riconcilia i pagamenti della serata",
      "Qual è il totale incassi del turno?",
    ],
    magazzino: [
      "Quali prodotti sono sotto scorta minima?",
      "Ci sono lotti in scadenza questa settimana?",
    ],
    supervisor: [
      "Qual è il margine medio di oggi?",
      "Dammi un report operativo della settimana",
    ],
    hotel: [
      "Quante camere sono libere stanotte?",
      "Check-in previsti per domani?",
    ],
    prenotazioni: [
      "Quante prenotazioni ci sono per sabato sera?",
      "Quali clienti VIP hanno prenotato?",
    ],
    pizzeria: ["Quante pizze sono in coda?", "Stato degli impasti per domani?"],
    bar: ["Cocktail più venduti questa settimana?", "Scorte critiche per il servizio serale?"],
  };
  return examples[context] || [];
}
