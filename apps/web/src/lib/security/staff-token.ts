import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Deterministic signed token for staff clock-in/out badges (QR + NFC).
 *
 * Format: base64url(`${tenantId}.${staffId}.${hmac16}`)
 * Stable: same staff member always yields the same token — safe to print.
 * Uses QR_SECRET (independent from JWT_SECRET) so rotating sessions
 * doesn't invalidate printed staff badges.
 */

function getQrSecret(): string {
  const qr = process.env.QR_SECRET?.trim();
  if (qr && qr.length >= 16) return qr;
  const jwt = process.env.JWT_SECRET?.trim();
  if (jwt && jwt.length >= 16) return jwt;
  return "ristosaas-qr-fallback-secret-v1";
}

function toBase64Url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function shortHmac(payload: string): string {
  return createHmac("sha256", getQrSecret()).update(`staff:${payload}`).digest("base64").slice(0, 16);
}

export function createStaffToken(params: { tenantId: string; staffId: string }): string {
  const payload = `${params.tenantId}.${params.staffId}`;
  const signature = shortHmac(payload);
  return toBase64Url(Buffer.from(`${payload}.${signature}`, "utf8"));
}

export function verifyStaffToken(token: string): { tenantId: string; staffId: string } | null {
  if (!token || token.length > 512) return null;
  let decoded: string;
  try {
    decoded = fromBase64Url(token).toString("utf8");
  } catch {
    return null;
  }
  const parts = decoded.split(".");
  if (parts.length !== 3) return null;
  const [tenantId, staffId, signature] = parts;
  if (!tenantId || !staffId || !signature) return null;
  const expected = shortHmac(`${tenantId}.${staffId}`);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return { tenantId, staffId };
}
