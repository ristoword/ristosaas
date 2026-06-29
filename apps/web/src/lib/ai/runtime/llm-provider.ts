import {
  callOpenAIChatCompletion,
  streamOpenAIChatCompletion,
  type StreamCompletionResult,
  type ToolCall,
} from "@/lib/ai/openai-stream";
import type { OpenAiUsage } from "@/lib/ai/runtime/types";

export type LlmProviderId = "openai" | "anthropic" | "gemini";

export function normalizeProvider(provider: string): LlmProviderId {
  const p = provider.trim().toLowerCase();
  if (p === "anthropic" || p === "claude") return "anthropic";
  if (p === "gemini" || p === "google" || p === "google-ai") return "gemini";
  return "openai";
}

/** Resolves API key for the configured LLM provider (tenant/agent level via agent.provider). */
export function resolveProviderApiKey(provider: string): string | null {
  switch (normalizeProvider(provider)) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY?.trim() ?? null;
    case "gemini":
      return (
        process.env.GOOGLE_AI_API_KEY?.trim() ??
        process.env.GEMINI_API_KEY?.trim() ??
        process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ??
        null
      );
    default:
      return process.env.OPENAI_API_KEY?.trim() ?? null;
  }
}

type ChatMessage = {
  role: string;
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

function splitSystemMessages(messages: ChatMessage[]) {
  const systemParts = messages
    .filter((m) => m.role === "system" && m.content?.trim())
    .map((m) => m.content!.trim());
  const chatMessages = messages.filter((m) => m.role !== "system");
  return {
    system: systemParts.join("\n\n") || undefined,
    messages: chatMessages,
  };
}

function toAnthropicMessages(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content ?? "",
    }));
}

async function callAnthropicChatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ content: string | null; toolCalls: ToolCall[]; usage: OpenAiUsage | null }> {
  const rawMessages = (body.messages ?? []) as ChatMessage[];
  const { system, messages } = splitSystemMessages(rawMessages);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model ?? "claude-3-5-haiku-20241022",
      max_tokens: body.max_tokens ?? 1200,
      temperature: body.temperature ?? 0.4,
      system,
      messages: toAnthropicMessages(messages),
    }),
    signal: signal ?? AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic error: ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text = data.content?.find((c) => c.type === "text")?.text?.trim() ?? null;
  const usage = data.usage
    ? {
        promptTokens: data.usage.input_tokens ?? 0,
        completionTokens: data.usage.output_tokens ?? 0,
        totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
      }
    : null;

  return { content: text, toolCalls: [], usage };
}

async function streamAnthropicChatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<StreamCompletionResult> {
  const result = await callAnthropicChatCompletion(apiKey, body, signal);
  if (result.content) onToken(result.content);
  return { content: result.content ?? "", toolCalls: [], usage: result.usage };
}

async function callGeminiChatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ content: string | null; toolCalls: ToolCall[]; usage: OpenAiUsage | null }> {
  const rawMessages = (body.messages ?? []) as ChatMessage[];
  const { system, messages } = splitSystemMessages(rawMessages);
  const model = String(body.model ?? "gemini-1.5-flash");

  const contents = toAnthropicMessages(messages).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: {
        temperature: body.temperature ?? 0.4,
        maxOutputTokens: body.max_tokens ?? 1200,
      },
    }),
    signal: signal ?? AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error: ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  };

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? null;
  const usage = data.usageMetadata
    ? {
        promptTokens: data.usageMetadata.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata.totalTokenCount ?? 0,
      }
    : null;

  return { content: text, toolCalls: [], usage };
}

async function streamGeminiChatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<StreamCompletionResult> {
  const result = await callGeminiChatCompletion(apiKey, body, signal);
  if (result.content) onToken(result.content);
  return { content: result.content ?? "", toolCalls: [], usage: result.usage };
}

export async function callLlmChatCompletion(
  provider: string,
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ content: string | null; toolCalls: ToolCall[]; usage: OpenAiUsage | null }> {
  switch (normalizeProvider(provider)) {
    case "anthropic":
      return callAnthropicChatCompletion(apiKey, body, signal);
    case "gemini":
      return callGeminiChatCompletion(apiKey, body, signal);
    default:
      return callOpenAIChatCompletion(apiKey, body, signal);
  }
}

export async function streamLlmChatCompletion(
  provider: string,
  apiKey: string,
  body: Record<string, unknown>,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<StreamCompletionResult> {
  switch (normalizeProvider(provider)) {
    case "anthropic":
      return streamAnthropicChatCompletion(apiKey, body, onToken, signal);
    case "gemini":
      return streamGeminiChatCompletion(apiKey, body, onToken, signal);
    default:
      return streamOpenAIChatCompletion(apiKey, body, onToken, signal);
  }
}

export function supportsToolCalling(provider: string): boolean {
  return normalizeProvider(provider) === "openai";
}
