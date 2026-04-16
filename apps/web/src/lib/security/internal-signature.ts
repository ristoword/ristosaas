import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function normalizeHex(input: string) {
  return input.trim().toLowerCase();
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(normalizeHex(left), "hex");
  const rightBuffer = Buffer.from(normalizeHex(right), "hex");
  if (leftBuffer.length === 0 || rightBuffer.length === 0) return false;
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createInternalSignature(secret: string, timestampMs: number, method: string, pathname: string, body = "") {
  const canonical = `${timestampMs}.${method.toUpperCase()}.${pathname}.${body}`;
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export function verifyInternalSignature(params: {
  secret: string;
  timestampMs: number;
  providedSignature: string;
  method: string;
  pathname: string;
  body?: string;
}) {
  const { secret, timestampMs, providedSignature, method, pathname, body = "" } = params;
  const now = Date.now();
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > MAX_CLOCK_SKEW_MS) {
    return false;
  }
  const expected = createInternalSignature(secret, timestampMs, method, pathname, body);
  return safeEqualHex(expected, providedSignature);
}
