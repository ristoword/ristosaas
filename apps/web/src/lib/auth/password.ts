import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_PREFIX = "scrypt";

export function hashPassword(plainTextPassword: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainTextPassword, salt, SCRYPT_KEYLEN).toString("hex");
  return `${SCRYPT_PREFIX}$${salt}$${hash}`;
}

export function isHashedPassword(value: string) {
  return value.startsWith(`${SCRYPT_PREFIX}$`);
}

export function verifyPassword(storedPassword: string, plainTextPassword: string) {
  if (!isHashedPassword(storedPassword)) {
    // Legacy fallback during migration from plain-text password storage.
    return storedPassword === plainTextPassword;
  }

  const [_prefix, salt, expectedHash] = storedPassword.split("$");
  if (!salt || !expectedHash) return false;

  const computedHash = scryptSync(plainTextPassword, salt, SCRYPT_KEYLEN).toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");
  if (expectedBuffer.length !== computedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, computedBuffer);
}
