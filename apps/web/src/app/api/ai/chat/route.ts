import { NextRequest, NextResponse } from "next/server";
import { err, ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { executeRistoTool } from "@/lib/ai/risto-tools";
import { type AiMessage } from "@/lib/ai/chat-core";
import { callLlmChatCompletion, resolveProviderApiKey } from "@/lib/ai/runtime/llm-provider";
import { runAiChatStream } from "@/lib/ai/chat-stream";
import { prepareBuiltChatContext, recordMemoryExchange } from "@/lib/ai/memory/context-manager";
import { createSseResponse } from "@/lib/ai/sse";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";
import { isAiFeatureEnabled, isStreamingRuntimeEnabled } from "@/lib/ai/platform-config.runtime";
import { buildTelemetry, logAiRequest, usageFromOpenAi } from "@/lib/ai/runtime/telemetry";
import type { OpenAiUsage } from "@/lib/ai/runtime/types";

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user;

  if (!(await isAiFeatureEnabled("master"))) {
    return err("Infrastruttura AI disattivata dalla piattaforma", 503);
  }

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

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey && !payload.stream) {
    /* allow prepareBuiltChatContext to resolve provider-specific key */
  } else if (!apiKey && payload.stream) {
    await logAiRequest({
      tenantId,
      userId: user.id,
      context,
      userMessage: message,
      errorMessage: "Nessuna API key AI configurata",
    });
    return err("Nessuna API key AI configurata", 500);
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
    apiKey: apiKey ?? "",
  };

  if (payload.stream) {
    if (!(await isStreamingRuntimeEnabled())) {
      return err("Streaming AI disattivato dalla piattaforma", 503);
    }
    return createSseResponse(
      (emit, signal) => runAiChatStream(chatParams, emit, signal),
      req.signal,
    );
  }

  try {
    const built = await prepareBuiltChatContext({ ...chatParams });

    if (!built.runtime.active) {
      return err("Agente AI disattivato per questo tenant", 503);
    }

    if (!built.providerApiKey) {
      return err("Provider AI non configurato per questo agente", 500);
    }

    let totalUsage: OpenAiUsage | null = null;
    let response = await callLlmChatCompletion(built.runtime.provider, built.providerApiKey, built.openaiBodyBase);
    totalUsage = response.usage;
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

      response = await callLlmChatCompletion(built.runtime.provider, built.providerApiKey, followUp);
      if (response.usage) {
        totalUsage = {
          promptTokens: (totalUsage?.promptTokens ?? 0) + response.usage.promptTokens,
          completionTokens: (totalUsage?.completionTokens ?? 0) + response.usage.completionTokens,
          totalTokens: (totalUsage?.totalTokens ?? 0) + response.usage.totalTokens,
        };
      }
      if (!response.content) {
        const content = actionResults.join("\n\n");
        const tokens = usageFromOpenAi(totalUsage, message, content);
        await logAiRequest({
          tenantId,
          userId: user.id,
          context,
          userMessage: message,
          assistantMessage: content,
          telemetry: buildTelemetry({
            runtime: built.runtime,
            ...tokens,
            durationMs: Date.now() - built.startedAt,
            ragUsed: built.rag.used,
            ragDocumentsCount: built.rag.documentCount,
            webSearchUsed: built.webSearch.used,
            webSearchResultsCount: built.webSearch.resultCount,
          }),
        });
        await recordMemoryExchange({
          tenantId,
          userId: user.id,
          channel: "chat",
          context,
          userMessage: message,
          assistantMessage: content,
          toolsUsed,
          locale,
          memoryEnabled: built.runtime.memoryEnabled,
        });
        return ok({ reply: content, actions: actionResults });
      }
    }

    const content = response.content?.trim();
    if (!content) {
      const tokens = usageFromOpenAi(totalUsage, message, "");
      await logAiRequest({
        tenantId,
        userId: user.id,
        context,
        userMessage: message,
        errorMessage: "Risposta AI vuota",
        telemetry: buildTelemetry({
          runtime: built.runtime,
          ...tokens,
          durationMs: Date.now() - built.startedAt,
          ragUsed: built.rag.used,
          ragDocumentsCount: built.rag.documentCount,
          webSearchUsed: built.webSearch.used,
          webSearchResultsCount: built.webSearch.resultCount,
        }),
      });
      return err("Risposta AI vuota", 502);
    }

    const tokens = usageFromOpenAi(totalUsage, message, content);
    await logAiRequest({
      tenantId,
      userId: user.id,
      context,
      userMessage: message,
      assistantMessage: content,
      telemetry: buildTelemetry({
        runtime: built.runtime,
        ...tokens,
        durationMs: Date.now() - built.startedAt,
        ragUsed: built.rag.used,
        ragDocumentsCount: built.rag.documentCount,
        webSearchUsed: built.webSearch.used,
        webSearchResultsCount: built.webSearch.resultCount,
      }),
    });
    await recordMemoryExchange({
      tenantId,
      userId: user.id,
      channel: "chat",
      context,
      userMessage: message,
      assistantMessage: content,
      toolsUsed,
      locale,
      memoryEnabled: built.runtime.memoryEnabled,
    });
    return ok({ reply: content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto";
    await logAiRequest({
      tenantId,
      userId: user.id,
      context,
      userMessage: message,
      errorMessage: msg,
    });
    return err(msg, 502);
  }
}
