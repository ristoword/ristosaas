import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Deterministic signed token for public per-table URLs.
 *
 * Uses QR_SECRET (independent from JWT_SECRET) so rotating session secrets
 * does not invalidate printed QR codes. Falls back to JWT_SECRET if QR_SECRET
 * is not configured, and to a hard-coded fallback in development.
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
  return createHmac("sha256", getQrSecret()).update(`table:${payload}`).digest("base64").slice(0, 16);
}

export function createTableToken(params: { tenantId: string; tableId: string }): string {
  const payload = `${params.tenantId}.${params.tableId}`;
  const signature = shortHmac(payload);
  return toBase64Url(Buffer.from(`${payload}.${signature}`, "utf8"));
}

export function verifyTableToken(token: string): { tenantId: string; tableId: string } | null {
  if (!token || token.length > 512) return null;
  let decoded: string;
  try {
    decoded = fromBase64Url(token).toString("utf8");
  } catch {
    return null;
  }
  const parts = decoded.split(".");
  if (parts.length !== 3) return null;
  const [tenantId, tableId, signature] = parts;
  if (!tenantId || !tableId || !signature) return null;
  const expected = shortHmac(`${tenantId}.${tableId}`);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return { tenantId, tableId };
}
