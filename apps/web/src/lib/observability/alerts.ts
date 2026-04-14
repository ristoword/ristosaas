import { logger } from "@/lib/observability/logger";

declare global {
  // eslint-disable-next-line no-var
  var __opsAlertTimestamps: Map<string, number> | undefined;
}

function getCooldownMs() {
  const raw = Number(process.env.OPS_ALERT_COOLDOWN_SECONDS ?? "300");
  if (!Number.isFinite(raw) || raw <= 0) return 300_000;
  return Math.floor(raw * 1000);
}

function canSend(alertKey: string) {
  const now = Date.now();
  const cooldown = getCooldownMs();
  const state = global.__opsAlertTimestamps ?? new Map<string, number>();
  global.__opsAlertTimestamps = state;
  const lastSentAt = state.get(alertKey) ?? 0;
  if (now - lastSentAt < cooldown) return false;
  state.set(alertKey, now);
  return true;
}

export async function sendOperationalAlert(params: {
  key: string;
  title: string;
  message: string;
  severity: "warning" | "critical";
  metadata?: Record<string, unknown>;
}) {
  const webhook = process.env.OPS_ALERT_WEBHOOK_URL;
  if (!webhook || webhook.trim().length === 0) return { sent: false as const, reason: "missing_webhook" as const };
  if (!canSend(params.key)) return { sent: false as const, reason: "cooldown" as const };

  const payload = {
    text: `[${params.severity.toUpperCase()}] ${params.title}\n${params.message}`,
    metadata: {
      ...params.metadata,
      timestamp: new Date().toISOString(),
      service: "web",
      env: process.env.NODE_ENV || "development",
    },
  };

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) {
      logger.warn("ops_alert_delivery_failed", { status: response.status, key: params.key });
      return { sent: false as const, reason: "delivery_failed" as const, status: response.status };
    }
    logger.info("ops_alert_sent", { key: params.key, severity: params.severity });
    return { sent: true as const };
  } catch {
    logger.warn("ops_alert_network_error", { key: params.key });
    return { sent: false as const, reason: "network_error" as const };
  }
}
