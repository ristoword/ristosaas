export const SESSION_COOKIE = "ristosaas_session";
export const REFRESH_COOKIE = "ristosaas_refresh";
const DEV_JWT_FALLBACK = "ristosaas-dev-secret-change-me";

function isWeakSecret(secret: string) {
  return secret.trim().length < 32 || secret === DEV_JWT_FALLBACK;
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim() || "";
  if (!secret || isWeakSecret(secret)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required and must be strong in production");
    }
    return DEV_JWT_FALLBACK;
  }
  return secret;
}

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === "production";
}

const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24;
const SUPERVISOR_SESSION_MAX_AGE = 60 * 60 * 12;
const SUPERADMIN_SESSION_MAX_AGE = 60 * 60 * 8;
const DEFAULT_REFRESH_MAX_AGE = 60 * 60 * 24 * 14;

function parseSessionAge(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export const SESSION_MAX_AGE_SECONDS = parseSessionAge(process.env.SESSION_MAX_AGE_SECONDS, DEFAULT_SESSION_MAX_AGE);
export const SESSION_MAX_AGE_SUPERVISOR_SECONDS = parseSessionAge(
  process.env.SESSION_MAX_AGE_SUPERVISOR_SECONDS,
  SUPERVISOR_SESSION_MAX_AGE,
);
export const SESSION_MAX_AGE_SUPERADMIN_SECONDS = parseSessionAge(
  process.env.SESSION_MAX_AGE_SUPERADMIN_SECONDS,
  SUPERADMIN_SESSION_MAX_AGE,
);
export const REFRESH_MAX_AGE_SECONDS = parseSessionAge(process.env.REFRESH_MAX_AGE_SECONDS, DEFAULT_REFRESH_MAX_AGE);
