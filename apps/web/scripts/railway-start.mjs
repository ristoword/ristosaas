#!/usr/bin/env node
/**
 * Railway start: prefer private Postgres, migrate, then next start.
 *
 * Production was crashing with P1001 against gondola.proxy.rlwy.net:21479
 * because DATABASE_URL pointed at the public TCP proxy. Other Railway
 * services must use *.railway.internal:5432.
 */
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lookup } from "node:dns/promises";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseHostPort(url) {
  const match = url.match(/@([^/?]+)/);
  if (!match) return { host: "", port: "" };
  const hostPort = match[1];
  const colon = hostPort.lastIndexOf(":");
  if (colon === -1) return { host: hostPort, port: "5432" };
  return { host: hostPort.slice(0, colon), port: hostPort.slice(colon + 1) };
}

function replaceHostPort(url, host, port) {
  return url.replace(/@([^/?]+)/, `@${host}:${port}`);
}

function setQueryParam(url, key, value) {
  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const qIndex = withoutHash.indexOf("?");
  const path = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const params = new URLSearchParams(qIndex >= 0 ? withoutHash.slice(qIndex + 1) : "");
  params.set(key, value);
  return `${path}?${params.toString()}${hash}`;
}

function prepareInternalUrl(url) {
  let next = setQueryParam(url, "sslmode", "disable");
  if (!new URLSearchParams(next.split("?")[1] || "").get("connect_timeout")) {
    next = setQueryParam(next, "connect_timeout", "30");
  }
  return next;
}

function isPublicProxy(host) {
  return /\.proxy\.rlwy\.net$/i.test(host);
}

function isInternal(host) {
  return /\.railway\.internal$/i.test(host);
}

function pickPrivateUrl(env) {
  return env.DATABASE_PRIVATE_URL || env.POSTGRES_PRIVATE_URL || env.DATABASE_URL_PRIVATE || "";
}

function pickInternalHost(env) {
  if (isInternal(env.PGHOST || "")) return env.PGHOST;
  for (const value of Object.values(env)) {
    if (typeof value !== "string" || !value) continue;
    if (isInternal(value) && /postgres/i.test(value) && !value.includes("://")) return value;
    if (value.includes("://")) {
      const host = parseHostPort(value).host;
      if (isInternal(host)) return host;
    }
  }
  return "postgres.railway.internal";
}

function resolveDatabaseUrl(env) {
  const current = env.DATABASE_URL || "";
  const currentHost = parseHostPort(current).host;
  const privateUrl = pickPrivateUrl(env);
  if (privateUrl && isInternal(parseHostPort(privateUrl).host)) {
    const url = prepareInternalUrl(privateUrl);
    return { url, ...parseHostPort(url), source: "database_private_url" };
  }
  if (!current || !isPublicProxy(currentHost)) {
    return { url: current, ...parseHostPort(current), source: "unchanged" };
  }
  const host = pickInternalHost(env);
  const url = prepareInternalUrl(replaceHostPort(current, host, "5432"));
  return { url, ...parseHostPort(url), source: "rewritten_private" };
}

function redact(url) {
  return url.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@");
}

function tcpProbe(host, port, timeoutMs = 4000) {
  return new Promise((ok) => {
    const socket = createConnection({ host, port: Number(port), timeout: timeoutMs });
    const done = (result) => {
      socket.destroy();
      ok(result);
    };
    socket.on("connect", () => done(true));
    socket.on("error", () => done(false));
    socket.on("timeout", () => done(false));
  });
}

async function describeHost(host) {
  try {
    const records = await lookup(host, { all: true });
    return records.map((r) => `${r.address} (${r.family === 6 ? "IPv6" : "IPv4"})`).join(", ");
  } catch (error) {
    return `DNS failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
      cwd: webRoot,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(" ")} exited ${signal || code}`));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function migrateWithRetry() {
  const attempts = 6;
  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await run("pnpm", ["prisma:migrate:deploy"]);
      return;
    } catch (error) {
      lastError = error;
      console.error(`[railway-start] migrate attempt ${i}/${attempts} failed`);
      if (i < attempts) await sleep(2000 * i);
    }
  }
  throw lastError;
}

const resolved = resolveDatabaseUrl(process.env);
if (resolved.url) process.env.DATABASE_URL = resolved.url;

console.log(
  `[railway-start] database source=${resolved.source} host=${resolved.host}:${resolved.port || "5432"}`,
);
console.log(`[railway-start] DATABASE_URL=${redact(process.env.DATABASE_URL || "")}`);

if (resolved.host) {
  const dns = await describeHost(resolved.host);
  console.log(`[railway-start] DNS ${resolved.host} → ${dns}`);
  const reachable = await tcpProbe(resolved.host, resolved.port || "5432");
  if (!reachable) {
    const publicHost = parseHostPort(process.env.DATABASE_PUBLIC_URL || "").host;
    console.error(
      `[railway-start] cannot open TCP ${resolved.host}:${resolved.port || "5432"}.`,
    );
    console.error(
      "[railway-start] Fix in Railway: Postgres service must be Running, then set the web service DATABASE_URL to ${{Postgres.DATABASE_PRIVATE_URL}} (host *.railway.internal:5432), not the public proxy" +
        (publicHost ? ` (${publicHost})` : " (*.proxy.rlwy.net)."),
    );
  } else {
    console.log(`[railway-start] TCP ${resolved.host}:${resolved.port || "5432"} is reachable`);
  }
}

await migrateWithRetry();
const port = process.env.PORT || "3000";
await run("pnpm", ["exec", "next", "start", "-p", port, "-H", "0.0.0.0"]);
