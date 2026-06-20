import { NextRequest, NextResponse } from "next/server";
import { err, ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiChatRepository } from "@/lib/db/repositories/ai-chat.repository";
import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";
import { RISTO_TOOLS, executeRistoTool } from "@/lib/ai/risto-tools";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";

type AiRole = "user" | "assistant";
type AiMessage = { role: AiRole; content: string };

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 1200);
const TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.4);

const RISTO_ROLES = ["owner", "supervisor", "cucina", "sala", "bar", "pizzeria", "magazzino", "cassa", "super_admin"] as const;

function systemPromptForContext(context: string, isRisto: boolean) {
  const ristoIdentity = isRisto
    ? `Sei "Risto", l'assistente vocale intelligente di RistoSimply. Il tuo nome è Risto.
Ti parlano i dipendenti del ristorante/hotel. Rispondi SEMPRE in italiano, in modo amichevole ma professionale.
Quando l'utente chiede di FARE qualcosa (creare ricette, aggiornare scorte, aggiungere vini, ecc.), USA le funzioni/tools disponibili per eseguire l'azione realmente nel gestionale.
Dopo aver eseguito un'azione, conferma con un riepilogo chiaro di cosa hai fatto.
Se non sei sicuro dei parametri, chiedi conferma prima di eseguire.
Puoi gestire comandi vocali come:
- "Risto crea una ricetta con questi ingredienti..."
- "Risto segna 10 kg di filetto per stasera"
- "Risto carica questa bolla dal fornitore..."
- "Risto aggiungi un Barolo in cantina"
- "Risto come stiamo oggi?"
- "Risto prepara la lista verdure da ordinare"`
    : "Sei l'assistente operativo di RistoSimply. Rispondi in italiano, in modo sintetico e pratico, con focus su azioni concrete.";

  const byContext: Record<string, string> = {
    supervisor:
      "Focus: KPI, margini, food cost, efficienza staff, raccomandazioni operative manageriali.",
    cassa:
      "Focus: chiusure conto, pagamenti, storni, eccezioni cassa, room-charge e riconciliazione.",
    cucina:
      "Focus: priorità comande, corsi, tempi servizio, allergeni, food cost e standard operativi. Puoi creare ricette con ingredienti e passaggi.",
    hotel:
      "Focus: front desk, check-in/check-out, occupazione camere, folio, keycard, housekeeping e pagamenti soggiorno.",
    prenotazioni:
      "Focus: prenotazioni ristorante, gestione clienti abituali, allergeni e intolleranze, richieste specifiche, abitudini dei clienti, preferenze tavolo, gestione disponibilità, conferme e cancellazioni.",
    magazzino:
      "Focus: inventario, scorte minime, lotti in scadenza, movimenti di carico/scarico, riordini fornitori, FIFO e food cost ingredienti. Puoi aggiornare le giacenze e preparare ordini.",
    bar:
      "Focus: comande bevande, cocktail, servizio al bancone, gestione scorte drink, tempistiche servizio.",
    pizzeria:
      "Focus: comande pizze, gestione impasti, tempi forno, varianti e personalizzazioni, flusso ordini.",
    cantina:
      "Focus: carta dei vini, giacenze bottiglie, prezzi, annate, abbinamenti. Puoi aggiungere vini e aggiornare le giacenze.",
    risto:
      "Sei in modalità operativa completa. Puoi gestire QUALSIASI reparto: cucina, magazzino, cantina, sala, menu, ordini. Usa le funzioni per eseguire le azioni richieste.",
    default:
      "Focus: supporto operativo generale su ristorante/hotel/integration.",
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

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user;
  const tenantId = user?.tenantId || getTenantId();

  // Protect OpenAI budget: per-minute burst + per-day quota, scoped to user+tenant.
  const limitKey = `${clientIpFromRequest(req)}|${user?.id ?? "anon"}|${tenantId ?? "none"}`;
  const minute = await applyRateLimit(limitKey, {
    bucket: "ai:chat:minute",
    limit: 30,
    windowMs: 60_000,
  });
  if (!minute.allowed) {
    const res = NextResponse.json(
      { error: `Troppe richieste AI. Riprova tra ${Math.ceil(minute.resetInMs / 1000)}s.` },
      { status: 429 },
    );
    for (const [k, v] of Object.entries(rateLimitHeaders(minute))) res.headers.set(k, v);
    return res;
  }
  const daily = await applyRateLimit(limitKey, {
    bucket: "ai:chat:day",
    limit: 500,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!daily.allowed) {
    const res = NextResponse.json(
      { error: "Hai raggiunto il limite giornaliero AI. Riprova domani." },
      { status: 429 },
    );
    for (const [k, v] of Object.entries(rateLimitHeaders(daily))) res.headers.set(k, v);
    return res;
  }

  const payload = await body<{
    context?: string;
    message?: string;
    history?: AiMessage[];
    enableTools?: boolean;
  }>(req);

  const message = payload.message?.trim();
  if (!message) return err("message is required");
  const context = (payload.context || "default").trim().toLowerCase();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await aiChatRepository.log({
      tenantId,
      userId: user.id,
      context,
      userMessage: message,
      errorMessage: "OPENAI_API_KEY non configurata",
    });
    return err("OPENAI_API_KEY non configurata", 500);
  }
  const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];
  const safeHistory = history.filter(
    (item) =>
      item &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string" &&
      item.content.trim().length > 0,
  );
  const isRisto = context === "risto" || Boolean(payload.enableTools);
  const userRole = user.role || "";
  const canUseFunctions = isRisto && (RISTO_ROLES as readonly string[]).includes(userRole);

  let systemPrompt = systemPromptForContext(context, isRisto);
  if (context === "cucina" || (isRisto && ["cucina", "risto"].includes(context))) {
    try {
      const snapshot = await aiKitchenRepository.snapshot(tenantId, 14);
      systemPrompt = `${systemPrompt}\n\n${kitchenSnapshotToPrompt(snapshot)}`;
    } catch { /* non-blocking */ }
  }

  type OpenAiMessage = { role: string; content?: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
  type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

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

  async function callOpenAI(reqBody: Record<string, unknown>): Promise<Response> {
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(reqBody),
          signal: AbortSignal.timeout(30_000),
        });
        if (response.status < 500) break;
      } catch (fetchError) {
        if (attempt >= 2) throw fetchError;
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
    if (!response) throw new Error("OpenAI non raggiungibile");
    return response;
  }

  try {
    let response = await callOpenAI(openaiBodyBase);

    if (!response.ok) {
      const errorText = await response.text();
      await aiChatRepository.log({ tenantId, userId: user.id, context, userMessage: message, errorMessage: `OpenAI error: ${errorText}` });
      return err(`OpenAI error: ${errorText || response.statusText}`, 502);
    }

    let data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] }; finish_reason?: string }>;
    };

    const firstChoice = data.choices?.[0];
    const toolCalls = firstChoice?.message?.tool_calls;

    if (canUseFunctions && toolCalls && toolCalls.length > 0) {
      messages.push({ role: "assistant", content: firstChoice?.message?.content ?? null, tool_calls: toolCalls });

      const actionResults: string[] = [];
      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments); } catch { /* empty */ }

        const result = await executeRistoTool(tc.function.name, args, tenantId);
        actionResults.push(result.message);

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      const followUp: Record<string, unknown> = { ...openaiBodyBase, messages };
      delete followUp.tools;
      delete followUp.tool_choice;

      response = await callOpenAI(followUp);
      if (!response.ok) {
        const content = actionResults.join("\n\n");
        await aiChatRepository.log({ tenantId, userId: user.id, context, userMessage: message, assistantMessage: content });
        return ok({ reply: content, actions: actionResults });
      }

      data = await response.json();
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      await aiChatRepository.log({ tenantId, userId: user.id, context, userMessage: message, errorMessage: "Risposta AI vuota" });
      return err("Risposta AI vuota", 502);
    }

    await aiChatRepository.log({ tenantId, userId: user.id, context, userMessage: message, assistantMessage: content });
    return ok({ reply: content });

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto";
    await aiChatRepository.log({ tenantId, userId: user.id, context, userMessage: message, errorMessage: msg });
    return err(msg, 502);
  }
}
