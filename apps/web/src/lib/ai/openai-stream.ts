import type { OpenAiUsage } from "@/lib/ai/runtime/types";

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type StreamCompletionResult = {
  content: string;
  toolCalls: ToolCall[];
  usage: OpenAiUsage | null;
};

function parseUsage(raw: unknown): OpenAiUsage | null {
  const u = raw as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
  if (!u) return null;
  return {
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens: u.completion_tokens ?? 0,
    totalTokens: u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0),
  };
}

/** Stream OpenAI chat completion tokens; returns full text + any tool calls accumulated. */
export async function streamOpenAIChatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<StreamCompletionResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...body, stream: true, stream_options: { include_usage: true } }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${errorText || response.statusText}`);
  }

  if (!response.body) {
    throw new Error("OpenAI stream body missing");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolCalls: ToolCall[] = [];
  let usage: OpenAiUsage | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;

      let parsed: {
        usage?: unknown;
        choices?: Array<{
          delta?: {
            content?: string | null;
            tool_calls?: Array<{
              index: number;
              id?: string;
              type?: "function";
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
      };

      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      if (parsed.usage) usage = parseUsage(parsed.usage);

      const delta = parsed.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        content += delta.content;
        onToken(delta.content);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCalls[idx]) {
            toolCalls[idx] = { id: tc.id ?? "", type: "function", function: { name: "", arguments: "" } };
          }
          if (tc.id) toolCalls[idx].id = tc.id;
          if (tc.function?.name) toolCalls[idx].function.name = tc.function.name;
          if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
        }
      }
    }

    if (signal?.aborted) {
      reader.cancel().catch(() => undefined);
      throw new DOMException("Aborted", "AbortError");
    }
  }

  return { content, toolCalls: toolCalls.filter(Boolean), usage };
}

/** Non-streaming completion (tool round-trip). */
export async function callOpenAIChatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{
  content: string | null;
  toolCalls: ToolCall[];
  usage: OpenAiUsage | null;
}> {
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: signal ?? AbortSignal.timeout(30_000),
      });
      if (response.status < 500) break;
    } catch (fetchError) {
      if (attempt >= 2) throw fetchError;
    }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  if (!response) throw new Error("OpenAI non raggiungibile");

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as {
    usage?: unknown;
    choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>;
  };

  const message = data.choices?.[0]?.message;
  return {
    content: message?.content?.trim() ?? null,
    toolCalls: message?.tool_calls ?? [],
    usage: parseUsage(data.usage),
  };
}

export type { ToolCall };
