import { createHmac, timingSafeEqual } from "node:crypto";

function getQrSecret(): string {
  // QR_SECRET is independent from JWT_SECRET so rotating sessions doesn't break printed QR codes.
  // Falls back to JWT_SECRET if not set (backward compatible).
  const qr = process.env.QR_SECRET?.trim();
  if (qr && qr.length >= 16) return qr;
  const jwt = process.env.JWT_SECRET?.trim();
  if (jwt && jwt.length >= 16) return jwt;
  return "ristosaas-qr-fallback-secret-v1";
}

/**
 * Deterministic signed token for public per-room URLs (hotel room service).
 *
 * Format: `${tenantId}.${roomCode}.${shortHmac}` base64url-encoded.
 * Stable: same room always yields the same token (safe to print on QR in room).
 * Uses the same JWT_SECRET as table tokens.
 */

function toBase64Url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function shortHmac(payload: string): string {
  return createHmac("sha256", getQrSecret()).update(`room:${payload}`).digest("base64").slice(0, 16);
}

export function createRoomToken(params: { tenantId: string; roomCode: string }): string {
  const payload = `${params.tenantId}.${params.roomCode}`;
  const signature = shortHmac(payload);
  return toBase64Url(Buffer.from(`${payload}.${signature}`, "utf8"));
}

export function verifyRoomToken(token: string): { tenantId: string; roomCode: string } | null {
  if (!token || token.length > 512) return null;
  let decoded: string;
  try {
    decoded = fromBase64Url(token).toString("utf8");
  } catch {
    return null;
  }
  // roomCode may contain dots (e.g. "1.A"), so split from the right
  const lastDot = decoded.lastIndexOf(".");
  const secondLastDot = decoded.lastIndexOf(".", lastDot - 1);
  if (lastDot < 0 || secondLastDot < 0) return null;

  const tenantId = decoded.slice(0, secondLastDot);
  const roomCode = decoded.slice(secondLastDot + 1, lastDot);
  const signature = decoded.slice(lastDot + 1);

  if (!tenantId || !roomCode || !signature) return null;

  const expected = shortHmac(`${tenantId}.${roomCode}`);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return { tenantId, roomCode };
}
