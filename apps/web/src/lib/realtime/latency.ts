"use client";

const LOG_PREFIX = "[realtime:latency]";

export function measureOrderLatency(serverTimestamp: string, eventName: string) {
  const now = Date.now();
  const serverMs = new Date(serverTimestamp).getTime();
  const latencyMs = now - serverMs;

  if (process.env.NODE_ENV === "development") {
    const color = latencyMs < 200 ? "\x1b[32m" : latencyMs < 500 ? "\x1b[33m" : "\x1b[31m";
    console.log(
      `${LOG_PREFIX} ${eventName}: ${color}${latencyMs}ms\x1b[0m (server→client)`,
    );
  }

  if (typeof window !== "undefined" && window.performance) {
    window.performance.mark(`ws:${eventName}:received`);
    try {
      window.performance.measure(
        `ws:${eventName}:latency`,
        { start: serverMs, end: now },
      );
    } catch {
      // clock drift or unsupported
    }
  }

  return latencyMs;
}
