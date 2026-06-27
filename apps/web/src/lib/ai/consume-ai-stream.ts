import type { AiStreamEvent } from "@/lib/ai/sse";

export type AiStreamHandlers = {
  onStatus?: (message: string) => void;
  onToken?: (token: string) => void;
  onDone?: (event: Extract<AiStreamEvent, { type: "done" }>) => void;
  onMeta?: (data: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

async function refreshAuthIfNeeded(path: string, res: Response): Promise<boolean> {
  if (res.status !== 401 || path === "/auth/login") return false;
  const refreshed = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return refreshed.ok;
}

function parseSseLine(line: string): AiStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload) return null;
  try {
    return JSON.parse(payload) as AiStreamEvent;
  } catch {
    return null;
  }
}

/**
 * Consume an AI SSE stream from POST /api/... with { stream: true }.
 * Supports AbortSignal for stop button.
 */
export async function consumeAiStream(
  path: string,
  body: Record<string, unknown>,
  handlers: AiStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const doFetch = () =>
    fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });

  let res = await doFetch();
  if (res.status === 401) {
    const ok = await refreshAuthIfNeeded(path, res);
    if (ok) res = await doFetch();
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    handlers.onError?.(json.error || `HTTP ${res.status}`);
    return;
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream") || !res.body) {
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (typeof json.reply === "string") {
      handlers.onToken?.(json.reply);
      handlers.onDone?.({ type: "done", reply: json.reply, actions: json.actions as string[] | undefined });
      return;
    }
    if (typeof json.report === "string") {
      handlers.onToken?.(json.report);
      handlers.onDone?.({ type: "done", report: json.report, generatedAt: json.generatedAt as string | undefined });
      return;
    }
    if (typeof json.narrative === "string") {
      handlers.onToken?.(json.narrative);
      handlers.onDone?.({
        type: "done",
        narrative: json.narrative,
        source: json.source as string | undefined,
        briefing: json.briefing,
      });
      return;
    }
    handlers.onError?.("Risposta AI non valida");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      for (const line of part.split("\n")) {
        const event = parseSseLine(line);
        if (!event) continue;
        switch (event.type) {
          case "status":
            handlers.onStatus?.(event.message);
            break;
          case "token":
            handlers.onToken?.(event.content);
            break;
          case "meta":
            handlers.onMeta?.(event.data);
            break;
          case "done":
            handlers.onDone?.(event);
            break;
          case "error":
            handlers.onError?.(event.message);
            break;
        }
      }
    }

    if (signal?.aborted) {
      reader.cancel().catch(() => undefined);
      break;
    }
  }
}
