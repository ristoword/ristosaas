/**
 * Railway Postgres is reachable from other services only on the private
 * network (*.railway.internal:5432). The public TCP proxy (*.proxy.rlwy.net)
 * is for laptops and CI — it is not a valid DATABASE_URL inside a Railway
 * container, and when the proxy is disabled Prisma fails with P1001.
 */

export type RailwayDbResolution = {
  url: string;
  host: string;
  port: string;
  source: "unchanged" | "database_private_url" | "rewritten_private";
  sslmode: string | null;
};

const PUBLIC_PROXY_HOST = /\.proxy\.rlwy\.net$/i;
const INTERNAL_HOST = /\.railway\.internal$/i;
const DEFAULT_INTERNAL_HOST = "postgres.railway.internal";
const DEFAULT_INTERNAL_PORT = "5432";

function isOnRailway(env: Record<string, string | undefined>): boolean {
  return Boolean(
    env.RAILWAY_ENVIRONMENT ||
      env.RAILWAY_PROJECT_ID ||
      env.RAILWAY_SERVICE_ID ||
      env.RAILWAY_PRIVATE_DOMAIN,
  );
}

function parseHostPort(url: string): { host: string; port: string } {
  const match = url.match(/@([^/?]+)/);
  if (!match) return { host: "", port: "" };
  const hostPort = match[1];
  const ipv6 = hostPort.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (ipv6) return { host: ipv6[1], port: ipv6[2] || "" };
  const colon = hostPort.lastIndexOf(":");
  if (colon === -1) return { host: hostPort, port: "" };
  return { host: hostPort.slice(0, colon), port: hostPort.slice(colon + 1) };
}

function replaceHostPort(url: string, host: string, port: string): string {
  return url.replace(/@([^/?]+)/, `@${host}:${port}`);
}

function setQueryParam(url: string, key: string, value: string): string {
  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const qIndex = withoutHash.indexOf("?");
  const path = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const params = new URLSearchParams(qIndex >= 0 ? withoutHash.slice(qIndex + 1) : "");
  params.set(key, value);
  return `${path}?${params.toString()}${hash}`;
}

function getQueryParam(url: string, key: string): string | null {
  const qIndex = url.indexOf("?");
  if (qIndex < 0) return null;
  const hashIndex = url.indexOf("#");
  const qs = url.slice(qIndex + 1, hashIndex >= 0 ? hashIndex : undefined);
  return new URLSearchParams(qs).get(key);
}

function hostFromUrl(url: string): string {
  return parseHostPort(url).host;
}

function pickPrivateUrl(env: Record<string, string | undefined>): string | undefined {
  const candidates = [
    env.DATABASE_PRIVATE_URL,
    env.POSTGRES_PRIVATE_URL,
    env.DATABASE_URL_PRIVATE,
  ];
  return candidates.find((value) => typeof value === "string" && value.length > 0);
}

function pickInternalHost(env: Record<string, string | undefined>): string {
  const pgHost = env.PGHOST || "";
  if (INTERNAL_HOST.test(pgHost)) return pgHost;

  for (const value of Object.values(env)) {
    if (!value) continue;
    if (INTERNAL_HOST.test(value) && /postgres/i.test(value) && !value.includes("://")) {
      return value;
    }
    if (value.includes("://") && INTERNAL_HOST.test(hostFromUrl(value))) {
      const host = hostFromUrl(value);
      if (host) return host;
    }
  }

  return DEFAULT_INTERNAL_HOST;
}

function prepareInternalUrl(url: string): string {
  let next = url;
  if (!getQueryParam(next, "sslmode")) {
    next = setQueryParam(next, "sslmode", "disable");
  } else if (getQueryParam(next, "sslmode") !== "disable") {
    next = setQueryParam(next, "sslmode", "disable");
  }
  if (!getQueryParam(next, "connect_timeout")) {
    next = setQueryParam(next, "connect_timeout", "30");
  }
  return next;
}

export function resolveRailwayDatabaseUrl(
  env: Record<string, string | undefined>,
): RailwayDbResolution {
  const current = env.DATABASE_URL || "";
  const currentHost = hostFromUrl(current);

  const unchanged = (url: string, source: RailwayDbResolution["source"]): RailwayDbResolution => {
    const { host, port } = parseHostPort(url);
    return {
      url,
      host,
      port: port || "5432",
      source,
      sslmode: getQueryParam(url, "sslmode"),
    };
  };

  if (!isOnRailway(env) || !current) {
    return unchanged(current, "unchanged");
  }

  const privateUrl = pickPrivateUrl(env);
  if (privateUrl && INTERNAL_HOST.test(hostFromUrl(privateUrl))) {
    const url = prepareInternalUrl(privateUrl);
    return unchanged(url, "database_private_url");
  }

  if (!PUBLIC_PROXY_HOST.test(currentHost) && INTERNAL_HOST.test(currentHost)) {
    return unchanged(prepareInternalUrl(current), "unchanged");
  }

  if (!PUBLIC_PROXY_HOST.test(currentHost)) {
    return unchanged(current, "unchanged");
  }

  const internalHost = pickInternalHost(env);
  const rewritten = prepareInternalUrl(
    replaceHostPort(current, internalHost, DEFAULT_INTERNAL_PORT),
  );
  const parsed = parseHostPort(rewritten);
  return {
    url: rewritten,
    host: parsed.host,
    port: parsed.port || DEFAULT_INTERNAL_PORT,
    source: "rewritten_private",
    sslmode: getQueryParam(rewritten, "sslmode"),
  };
}

export function applyRailwayPrivateDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): RailwayDbResolution {
  const resolved = resolveRailwayDatabaseUrl(env);
  if (resolved.url) {
    env.DATABASE_URL = resolved.url;
  }
  return resolved;
}

export function redactDatabaseUrl(url: string): string {
  return url.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@");
}

export function isRailwayPublicProxyHost(host: string): boolean {
  return PUBLIC_PROXY_HOST.test(host);
}
