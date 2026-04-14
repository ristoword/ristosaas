import { NextRequest } from "next/server";
import { err, ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiChatRepository } from "@/lib/db/repositories/ai-chat.repository";

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

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req);
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
        { role: "system", content: systemPromptForContext(context) },
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
