import { NextRequest, NextResponse } from "next/server";
import { err, ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { aiChatRepository } from "@/lib/db/repositories/ai-chat.repository";
import { executeRistoTool } from "@/lib/ai/risto-tools";
import { type AiMessage } from "@/lib/ai/chat-core";
import { callOpenAIChatCompletion } from "@/lib/ai/openai-stream";
import { runAiChatStream } from "@/lib/ai/chat-stream";
import { prepareBuiltChatContext, recordMemoryExchange } from "@/lib/ai/memory/context-manager";
import { createSseResponse } from "@/lib/ai/sse";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user;
  const tenantId = user?.tenantId || getTenantId();

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
    locale?: string;
    stream?: boolean;
  }>(req);

  const message = payload.message?.trim();
  if (!message) return err("message is required");
  const context = (payload.context || "default").trim().toLowerCase();
  const locale = (payload.locale || "it").trim().toLowerCase();

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
  const chatParams = {
    tenantId,
    userId: user.id,
    context,
    message,
    history,
    enableTools: payload.enableTools,
    locale,
    userRole: user.role || "",
    apiKey,
  };

  if (payload.stream) {
    return createSseResponse(
      (emit, signal) => runAiChatStream(chatParams, emit, signal),
      req.signal,
    );
  }

  try {
    const built = await prepareBuiltChatContext({ ...chatParams });
    let response = await callOpenAIChatCompletion(apiKey, built.openaiBodyBase);
    let toolsUsed: string[] = [];

    if (built.canUseFunctions && response.toolCalls.length > 0) {
      toolsUsed = response.toolCalls.map((tc) => tc.function.name);
      built.messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls,
      });

      const actionResults: string[] = [];
      for (const tc of response.toolCalls) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments); } catch { /* empty */ }

        const result = await executeRistoTool(tc.function.name, args, tenantId);
        actionResults.push(result.message);

        built.messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      const followUp: Record<string, unknown> = { ...built.openaiBodyBase, messages: built.messages };
      delete followUp.tools;
      delete followUp.tool_choice;

      response = await callOpenAIChatCompletion(apiKey, followUp);
      if (!response.content) {
        const content = actionResults.join("\n\n");
        await aiChatRepository.log({ tenantId, userId: user.id, context, userMessage: message, assistantMessage: content });
        await recordMemoryExchange({
          tenantId,
          userId: user.id,
          channel: "chat",
          context,
          userMessage: message,
          assistantMessage: content,
          toolsUsed,
          locale,
        });
        return ok({ reply: content, actions: actionResults });
      }
    }

    const content = response.content?.trim();
    if (!content) {
      await aiChatRepository.log({ tenantId, userId: user.id, context, userMessage: message, errorMessage: "Risposta AI vuota" });
      return err("Risposta AI vuota", 502);
    }

    await aiChatRepository.log({ tenantId, userId: user.id, context, userMessage: message, assistantMessage: content });
    await recordMemoryExchange({
      tenantId,
      userId: user.id,
      channel: "chat",
      context,
      userMessage: message,
      assistantMessage: content,
      toolsUsed,
      locale,
    });
    return ok({ reply: content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto";
    await aiChatRepository.log({ tenantId, userId: user.id, context, userMessage: message, errorMessage: msg });
    return err(msg, 502);
  }
}
