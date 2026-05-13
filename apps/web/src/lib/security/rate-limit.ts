import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
  limit: number;
  windowMs: number;
};

export type RateLimitOptions = {
  /** Unique identifier for the rule (e.g. "auth:login"). */
  bucket: string;
  /** Upper bound of hits allowed inside `windowMs`. */
  limit: number;
  /** Rolling window size in milliseconds. */
  windowMs: number;
};

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/**
 * In-memory fallback rate limiter used when DB is unavailable.
 * Keeps a Map of key → timestamp[] (sliding window).
 * Periodically prunes stale entries to avoid unbounded memory growth.
 */
const memStore = new Map<string, number[]>();
let lastPrune = Date.now();
const PRUNE_INTERVAL_MS = 120_000;

function memRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (now - lastPrune > PRUNE_INTERVAL_MS) {
    lastPrune = now;
    for (const [k, ts] of memStore) {
      const filtered = ts.filter((t) => now - t < windowMs);
      if (filtered.length === 0) memStore.delete(k);
      else memStore.set(k, filtered);
    }
  }

  const timestamps = (memStore.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    const resetInMs = Math.max(0, timestamps[0]! + windowMs - now);
    return { allowed: false, remaining: 0, resetInMs, limit, windowMs };
  }
  timestamps.push(now);
  memStore.set(key, timestamps);
  return { allowed: true, remaining: Math.max(0, limit - timestamps.length), resetInMs: windowMs, limit, windowMs };
}

/**
 * DB-backed rolling window rate limiter.
 *
 * We use a rolling count of rows inside the window instead of an atomic
 * counter — trade-off is at most ~1 extra row beyond the limit under
 * heavy concurrency, acceptable for protecting login / refresh / billing.
 *
 * Falls open on DB error so a misbehaving DB cannot lock users out.
 */
export async function applyRateLimit(rawKey: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const keyHash = hashKey(`${opts.bucket}|${rawKey}`);
  const now = new Date();
  const since = new Date(now.getTime() - opts.windowMs);

  try {
    const used = await prisma.rateLimitHit.count({
      where: { bucket: opts.bucket, keyHash, createdAt: { gte: since } },
    });

    if (used >= opts.limit) {
      const oldest = await prisma.rateLimitHit.findFirst({
        where: { bucket: opts.bucket, keyHash, createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      const resetAt = oldest ? oldest.createdAt.getTime() + opts.windowMs : now.getTime() + opts.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, resetAt - now.getTime()),
        limit: opts.limit,
        windowMs: opts.windowMs,
      };
    }

    await prisma.rateLimitHit.create({
      data: { bucket: opts.bucket, keyHash },
    });

    // Best-effort cleanup of old entries for this key (non-blocking).
    prisma.rateLimitHit
      .deleteMany({
        where: { bucket: opts.bucket, keyHash, createdAt: { lt: since } },
      })
      .catch(() => {});

    return {
      allowed: true,
      remaining: Math.max(0, opts.limit - used - 1),
      resetInMs: opts.windowMs,
      limit: opts.limit,
      windowMs: opts.windowMs,
    };
  } catch {
    return memRateLimit(keyHash, opts.limit, opts.windowMs);
  }
}

/** Standardized 429 headers. */
export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetInMs / 1000)),
    "Retry-After": String(Math.ceil(result.resetInMs / 1000)),
  } as const;
}

/** Extract a best-effort client IP from incoming Next.js headers. */
export function clientIpFromRequest(req: Request) {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
