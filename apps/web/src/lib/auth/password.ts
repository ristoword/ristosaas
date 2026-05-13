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

const MIN_PASSWORD_LENGTH = 12;

/**
 * Validates password strength. Returns null if valid, error message otherwise.
 */
export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
  }
  if (!/[a-z]/.test(password)) return "La password deve contenere almeno una lettera minuscola.";
  if (!/[A-Z]/.test(password)) return "La password deve contenere almeno una lettera maiuscola.";
  if (!/[0-9]/.test(password)) return "La password deve contenere almeno un numero.";
  return null;
}

export function verifyPassword(storedPassword: string, plainTextPassword: string) {
  if (!isHashedPassword(storedPassword)) {
    // Plain-text storage is no longer supported. Any remaining plain-text
    // password must be reset. Returning false forces the user to go through
    // the "forgot password" / temp-password flow instead of granting access.
    return false;
  }

  const [_prefix, salt, expectedHash] = storedPassword.split("$");
  if (!salt || !expectedHash) return false;

  const computedHash = scryptSync(plainTextPassword, salt, SCRYPT_KEYLEN).toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");
  if (expectedBuffer.length !== computedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, computedBuffer);
}
