import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function deriveKey(): Buffer {
  const secret =
    process.env.MOBILE_ACCESS_ENCRYPTION_KEY ||
    process.env.GUEST_REGISTER_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "mobile-access-dev-key";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = randomBytes(IV_BYTES);
  const key = deriveKey();
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([encrypted, tag]).toString("base64");
  return `${iv.toString("base64")}:${payload}`;
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  const [ivB64, payloadB64] = stored.split(":");
  if (!ivB64 || !payloadB64) return "";
  const key = deriveKey();
  const iv = Buffer.from(ivB64, "base64");
  const data = Buffer.from(payloadB64, "base64");
  const tag = data.subarray(data.length - 16);
  const encrypted = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function hashSecureToken(token: string): string {
  const secret = process.env.MOBILE_ACCESS_LINK_SECRET || process.env.JWT_SECRET || "link-dev";
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
