import { NextRequest } from "next/server";
import { err, ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiChatRepository } from "@/lib/db/repositories/ai-chat.repository";
import { aiKitchenRepository } from "@/lib/db/repositories/ai-kitchen.repository";

type AiRole = "user" | "assistant";
type AiMessage = { role: AiRole; content: string };

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 700);
const TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.4);

function systemPromptForContext(context: string) {
  const base =
    "Sei l'assistente operativo di RistoSaaS. Rispondi in italiano, in modo sintetico e pratico, con focus su azioni concrete.";

  const byContext: Record<string, string> = {
    supervisor:
      "Focus: KPI, margini, food cost, efficienza staff, raccomandazioni operative manageriali.",
    cassa:
      "Focus: chiusure conto, pagamenti, storni, eccezioni cassa, room-charge e riconciliazione.",
    cucina:
      "Focus: priorita comande, corsi, tempi servizio, allergeni, food cost e standard operativi.",
    hotel:
      "Focus: front desk, check-in/check-out, occupazione camere, folio, keycard, housekeeping e pagamenti soggiorno.",
    default:
      "Focus: supporto operativo generale su ristorante/hotel/integration.",
  };

  return `${base}\n${byContext[context] || byContext.default}`;
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

  const payload = await body<{
    context?: string;
    message?: string;
    history?: AiMessage[];
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
  let systemPrompt = systemPromptForContext(context);
  if (context === "cucina") {
    const snapshot = await aiKitchenRepository.snapshot(tenantId, 14);
    systemPrompt = `${systemPrompt}\n\n${kitchenSnapshotToPrompt(snapshot)}`;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        ...safeHistory,
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    await aiChatRepository.log({
      tenantId,
      userId: user.id,
      context,
      userMessage: message,
      errorMessage: `OpenAI error: ${errorText || response.statusText}`,
    });
    return err(`OpenAI error: ${errorText || response.statusText}`, 502);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    await aiChatRepository.log({
      tenantId,
      userId: user.id,
      context,
      userMessage: message,
      errorMessage: "Risposta AI vuota",
    });
    return err("Risposta AI vuota", 502);
  }

  await aiChatRepository.log({
    tenantId,
    userId: user.id,
    context,
    userMessage: message,
    assistantMessage: content,
  });

  return ok({ reply: content });
}
