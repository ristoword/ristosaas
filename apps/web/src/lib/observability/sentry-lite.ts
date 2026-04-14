type SentrySeverity = "fatal" | "error" | "warning" | "info" | "debug";

type CaptureContext = {
  source: "client" | "server";
  message: string;
  stack?: string;
  requestId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

type ParsedDsn = {
  projectId: string;
  publicKey: string;
  host: string;
  protocol: string;
  path: string;
};

function parseDsn(rawDsn: string): ParsedDsn | null {
  try {
    const dsnUrl = new URL(rawDsn);
    const projectId = dsnUrl.pathname.split("/").filter(Boolean).pop();
    if (!projectId || !dsnUrl.username) return null;
    const pathSegments = dsnUrl.pathname.split("/").filter(Boolean);
    pathSegments.pop();
    const path = pathSegments.length ? `/${pathSegments.join("/")}` : "";
    return {
      projectId,
      publicKey: dsnUrl.username,
      host: dsnUrl.host,
      protocol: dsnUrl.protocol.replace(":", ""),
      path,
    };
  } catch {
    return null;
  }
}

function getDsnForSource(source: "client" | "server") {
  if (source === "client") return process.env.NEXT_PUBLIC_SENTRY_DSN || null;
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || null;
}

function buildEnvelope(dsn: string, context: CaptureContext, level: SentrySeverity = "error") {
  const parsed = parseDsn(dsn);
  if (!parsed) return null;
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const timestampIso = new Date().toISOString();
  const release = process.env.NEXT_PUBLIC_APP_VERSION || process.env.APP_VERSION || "unknown";

  const payload = {
    event_id: eventId,
    timestamp: Math.floor(Date.now() / 1000),
    level,
    platform: "javascript",
    environment: process.env.NODE_ENV || "development",
    release,
    tags: {
      source: context.source,
      ...(context.requestId ? { request_id: context.requestId } : {}),
      ...(context.tags ?? {}),
    },
    message: context.message,
    exception: context.stack
      ? {
          values: [
            {
              type: "Error",
              value: context.message,
              stacktrace: {
                frames: context.stack.split("\n").map((line, index) => ({
                  function: line.trim().slice(0, 120),
                  filename: context.source === "client" ? "client" : "server",
                  lineno: index + 1,
                })),
              },
            },
          ],
        }
      : undefined,
    extra: context.extra ?? {},
  };

  const envelopeHeaders = JSON.stringify({
    event_id: eventId,
    sent_at: timestampIso,
    dsn,
  });
  const itemHeaders = JSON.stringify({ type: "event" });
  const envelopeBody = `${envelopeHeaders}\n${itemHeaders}\n${JSON.stringify(payload)}`;

  const endpoint = `${parsed.protocol}://${parsed.host}${parsed.path}/api/${parsed.projectId}/envelope/`;
  return {
    endpoint,
    envelopeBody,
    authHeader: `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=ristosaas-sentry-lite/1.0`,
  };
}

export async function captureException(context: CaptureContext, level: SentrySeverity = "error") {
  const dsn = getDsnForSource(context.source);
  if (!dsn) return { sent: false as const, reason: "missing_dsn" as const };
  const envelope = buildEnvelope(dsn, context, level);
  if (!envelope) return { sent: false as const, reason: "invalid_dsn" as const };

  try {
    const response = await fetch(envelope.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": envelope.authHeader,
      },
      body: envelope.envelopeBody,
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    return { sent: response.ok as boolean, status: response.status };
  } catch {
    return { sent: false as const, reason: "network_error" as const };
  }
}
