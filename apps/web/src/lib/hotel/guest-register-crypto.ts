import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function deriveKey(): Buffer {
  const secret = process.env.GUEST_REGISTER_ENCRYPTION_KEY || process.env.JWT_SECRET || "guest-register-dev-key";
  return createHash("sha256").update(secret).digest();
}

export function encryptDocument(plainBase64: string): { iv: string; encrypted: string } {
  const iv = randomBytes(IV_BYTES);
  const key = deriveKey();
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBase64, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    encrypted: Buffer.concat([encrypted, tag]).toString("base64"),
  };
}

export function decryptDocument(ivBase64: string, encryptedBase64: string): string {
  const key = deriveKey();
  const iv = Buffer.from(ivBase64, "base64");
  const data = Buffer.from(encryptedBase64, "base64");
  const tag = data.subarray(data.length - 16);
  const encrypted = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
