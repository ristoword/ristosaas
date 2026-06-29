import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";
import { retrieveManualContext } from "@/lib/ai/rag";
import { RISTO_TOOLS } from "@/lib/ai/risto-tools";
import { pickStatusMessage } from "@/lib/ai/stream-status";
import type { SseEmitter } from "@/lib/ai/sse";

export type AiRole = "user" | "assistant";
export type AiMessage = { role: AiRole; content: string };

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
export const MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 1200);
export const TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.4);

export const RISTO_ROLES = ["owner", "supervisor", "cucina", "sala", "bar", "pizzeria", "magazzino", "cassa", "super_admin"] as const;

const LANG_NAMES: Record<string, string> = { it: "italiano", en: "English", nl: "Nederlands", pt: "português" };

export type OpenAiMessage = {
  role: string;
  content?: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

export function systemPromptForContext(context: string, isRisto: boolean, locale = "it") {
  const langName = LANG_NAMES[locale] || LANG_NAMES.it;
  const langRule = `Rispondi SEMPRE in ${langName}.`;

  const ristoIdentity = isRisto
    ? `Sei "Risto", l'assistente vocale intelligente di RistoSimply. Il tuo nome è Risto.
Ti parlano i dipendenti del ristorante/hotel. ${langRule}
Rispondi in modo amichevole ma professionale.
Quando l'utente chiede di FARE qualcosa (creare ricette, aggiornare scorte, aggiungere vini, ecc.), USA le funzioni/tools disponibili per eseguire l'azione realmente nel gestionale.
Dopo aver eseguito un'azione, conferma con un riepilogo chiaro di cosa hai fatto.
Se non sei sicuro dei parametri, chiedi conferma prima di eseguire.`
    : `Sei l'assistente operativo di RistoSimply. ${langRule} Rispondi in modo sintetico e pratico, con focus su azioni concrete.`;

  const byContext: Record<string, string> = {
    supervisor: "Focus: KPI, margini, food cost, efficienza staff, raccomandazioni operative manageriali.",
    cassa: "Focus: chiusure conto, pagamenti, storni, eccezioni cassa, room-charge e riconciliazione.",
    cucina: "Focus: priorità comande, corsi, tempi servizio, allergeni, food cost e standard operativi. Puoi creare ricette con ingredienti e passaggi.",
    hotel: "Focus: front desk, check-in/check-out, occupazione camere, folio, keycard, housekeeping e pagamenti soggiorno.",
    folio: "Focus: Guest Folio — analisi conto ospite, addebiti, pagamenti, saldo, tassa soggiorno, split folio, checkout, anomalie e upsell. Usa SOLO i dati folio forniti nel contesto. Per azioni operative richiedi sempre conferma umana.",
    prenotazioni: "Focus: prenotazioni ristorante, gestione clienti abituali, allergeni e intolleranze, richieste specifiche, abitudini dei clienti, preferenze tavolo, gestione disponibilità, conferme e cancellazioni.",
    magazzino: "Focus: inventario, scorte minime, lotti in scadenza, movimenti di carico/scarico, riordini fornitori, FIFO e food cost ingredienti. Puoi aggiornare le giacenze e preparare ordini.",
    bar: "Focus: comande bevande, cocktail, servizio al bancone, gestione scorte drink, tempistiche servizio.",
    pizzeria: "Focus: comande pizze, gestione impasti, tempi forno, varianti e personalizzazioni, flusso ordini.",
    cantina: "Focus: carta dei vini, giacenze bottiglie, prezzi, annate, abbinamenti. Puoi aggiungere vini e aggiornare le giacenze.",
    risto: "Sei in modalità operativa completa. Puoi gestire QUALSIASI reparto: cucina, magazzino, cantina, sala, menu, ordini. Usa le funzioni per eseguire le azioni richieste. Per domande come 'situazione di oggi', 'cosa devo fare', 'briefing del giorno' usa SEMPRE get_operational_briefing.",
    default: "Focus: supporto operativo generale su ristorante/hotel/integration.",
  };

  return `${ristoIdentity}\n${byContext[context] || byContext.default}`;
}

function kitchenSnapshotToPrompt(snapshot: Awaited<ReturnType<typeof aiKitchenRepository.snapshot>>) {
  const topDishes = snapshot.topDishes
    .slice(0, 8)
    .map((d) => `- ${d.name}: ${d.qty} porzioni, EUR ${d.revenue.toFixed(2)}`)
    .join("\n");
  const lowStock = snapshot.lowStockItems
    .slice(0, 8)
    .map((i) => `- ${i.name}: ${i.qty} ${i.unit} (min ${i.minStock})`)
    .join("\n");
  const overStock = snapshot.overStockItems
    .slice(0, 8)
    .map((i) => `- ${i.name}: ${i.qty} ${i.unit} (min ${i.minStock})`)
    .join("\n");
  const feasible = snapshot.feasibleDishes
    .slice(0, 10)
    .map(
      (f) =>
        `- ${f.menuItem} (ricetta: ${f.recipeName}) -> porzioni possibili: ${f.possiblePortions}${
          f.missingIngredients.length ? ` | mancanti: ${f.missingIngredients.join(", ")}` : ""
        }`,
    )
    .join("\n");

  return [
    `Dati cucina reali (ultimi ${snapshot.periodDays} giorni, generatedAt=${snapshot.generatedAt}):`,
    "Top vendite:",
    topDishes || "- nessun dato vendite",
    "Sotto scorta:",
    lowStock || "- nessuna sotto scorta",
    "Sovra-scorta:",
    overStock || "- nessuna sovra-scorta",
    "Piatti fattibili da stock attuale:",
    feasible || "- nessun piatto fattibile",
    "Quando rispondi, usa SOLO questi dati reali e fornisci SEMPRE:",
    "1) 3-5 piatti consigliati oggi con motivazione quantitativa",
    "2) prep list (mise en place) con priorita",
    "3) azioni riordino urgenti",
    "4) eventuali piatti da spingere per smaltire sovra-scorte",
  ].join("\n");
}

export type BuildChatContextParams = {
  tenantId: string;
  context: string;
  message: string;
  history: AiMessage[];
  enableTools?: boolean;
  locale?: string;
  userRole: string;
  apiKey: string;
  emit?: SseEmitter;
};

export type BuiltChatContext = {
  messages: OpenAiMessage[];
  openaiBodyBase: Record<string, unknown>;
  canUseFunctions: boolean;
  isRisto: boolean;
};

export async function buildChatContext(params: BuildChatContextParams): Promise<BuiltChatContext> {
  const {
    tenantId,
    context,
    message,
    history,
    enableTools,
    locale = "it",
    userRole,
    apiKey,
    emit,
  } = params;

  const safeHistory = history.filter(
    (item) =>
      item &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string" &&
      item.content.trim().length > 0,
  );

  const isRisto = context === "risto" || Boolean(enableTools);
  const canUseFunctions = isRisto && (RISTO_ROLES as readonly string[]).includes(userRole);

  emit?.({ type: "status", message: pickStatusMessage(context, 0) });

  let systemPrompt = systemPromptForContext(context, isRisto, locale);

  if (context === "cucina" || (isRisto && ["cucina", "risto"].includes(context))) {
    emit?.({ type: "status", message: pickStatusMessage("cucina", 1) });
    try {
      const snapshot = await aiKitchenRepository.snapshot(tenantId, 14);
      systemPrompt = `${systemPrompt}\n\n${kitchenSnapshotToPrompt(snapshot)}`;
    } catch { /* non-blocking */ }
  }

  emit?.({ type: "status", message: pickStatusMessage(context, 1) });
  try {
    const ragContext = await retrieveManualContext(message, apiKey);
    if (ragContext) systemPrompt = `${systemPrompt}\n\n${ragContext}`;
  } catch { /* non-blocking */ }

  emit?.({ type: "status", message: pickStatusMessage(context, 2) });

  const messages: OpenAiMessage[] = [
    { role: "system", content: systemPrompt },
    ...safeHistory,
    { role: "user", content: message },
  ];

  const openaiBodyBase: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    messages,
  };

  if (canUseFunctions) {
    openaiBodyBase.tools = RISTO_TOOLS;
    openaiBodyBase.tool_choice = "auto";
  }

  return { messages, openaiBodyBase, canUseFunctions, isRisto };
}

export { RISTO_TOOLS };
