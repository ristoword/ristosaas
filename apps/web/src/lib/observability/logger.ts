import { captureException } from "@/lib/observability/sentry-lite";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLogLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "").trim().toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "development" ? "debug" : "info";
}

function shouldLog(level: LogLevel) {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[resolveLogLevel()];
}

type Metadata = Record<string, unknown>;

function emit(level: LogLevel, event: string, metadata?: Metadata) {
  if (!shouldLog(level)) return;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata,
  };
  const serialized = JSON.stringify(payload);
  const source = typeof window === "undefined" ? "server" : "client";
  const sentryEnabled = process.env.SENTRY_ENABLED === "true";
  if (sentryEnabled && (level === "error" || level === "warn")) {
    void captureException(
      {
        source,
        message: `${event}`,
        extra: metadata,
      },
      level === "error" ? "error" : "warning",
    );
  }
  if (level === "error") {
    console.error(serialized);
    return;
  }
  if (level === "warn") {
    console.warn(serialized);
    return;
  }
  if (level === "debug") {
    console.debug(serialized);
    return;
  }
  console.info(serialized);
}

export const logger = {
  debug: (event: string, metadata?: Metadata) => emit("debug", event, metadata),
  info: (event: string, metadata?: Metadata) => emit("info", event, metadata),
  warn: (event: string, metadata?: Metadata) => emit("warn", event, metadata),
  error: (event: string, metadata?: Metadata) => emit("error", event, metadata),
};
