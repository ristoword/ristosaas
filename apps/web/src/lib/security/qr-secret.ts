/**
 * Shared QR/HMAC secret for table and room tokens.
 *
 * QR_SECRET is independent from JWT_SECRET so rotating session secrets
 * doesn't break printed QR codes. Falls back to JWT_SECRET if not set.
 * In production, throws if neither is configured.
 */
export function getQrSecret(): string {
  const qr = process.env.QR_SECRET?.trim();
  if (qr && qr.length >= 16) return qr;
  const jwt = process.env.JWT_SECRET?.trim();
  if (jwt && jwt.length >= 16) return jwt;
  if (process.env.NODE_ENV === "production") {
    throw new Error("QR_SECRET or JWT_SECRET (>= 16 chars) is required in production");
  }
  return "ristosaas-qr-dev-fallback-secret-v1";
}
