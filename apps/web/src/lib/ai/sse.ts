export type AiStreamEvent =
  | { type: "status"; message: string }
  | { type: "token"; content: string }
  | { type: "done"; reply?: string; report?: string; narrative?: string; actions?: string[]; source?: string; briefing?: unknown; generatedAt?: string }
  | { type: "meta"; data: Record<string, unknown> }
  | { type: "error"; message: string };

export type SseEmitter = (event: AiStreamEvent) => void;

const globalForSse = globalThis as unknown as {
  sseActiveConnections?: number;
  sseLastHeartbeat?: number;
};

export function getSseConnectionStats(): { activeConnections: number; lastHeartbeat: string } {
  return {
    activeConnections: globalForSse.sseActiveConnections ?? 0,
    lastHeartbeat: new Date(globalForSse.sseLastHeartbeat ?? Date.now()).toISOString(),
  };
}

function trackSseConnection(delta: number) {
  globalForSse.sseActiveConnections = Math.max(0, (globalForSse.sseActiveConnections ?? 0) + delta);
  globalForSse.sseLastHeartbeat = Date.now();
}

export function encodeSseEvent(event: AiStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export function createSseResponse(
  run: (emit: SseEmitter, signal: AbortSignal) => Promise<void>,
  reqSignal?: AbortSignal,
): Response {
  const abort = new AbortController();
  if (reqSignal) {
    reqSignal.addEventListener("abort", () => abort.abort(), { once: true });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      trackSseConnection(1);
      const emit: SseEmitter = (event) => {
        if (abort.signal.aborted) return;
        globalForSse.sseLastHeartbeat = Date.now();
        try {
          controller.enqueue(encodeSseEvent(event));
        } catch {
          abort.abort();
        }
      };

      try {
        await run(emit, abort.signal);
      } catch (e) {
        if (!abort.signal.aborted) {
          const message = e instanceof Error ? e.message : "Errore streaming AI";
          controller.enqueue(encodeSseEvent({ type: "error", message }));
        }
      } finally {
        trackSseConnection(-1);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
