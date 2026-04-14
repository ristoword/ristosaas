export const SESSION_COOKIE = "ristosaas_session";
export const JWT_SECRET = process.env.JWT_SECRET || "ristosaas-dev-secret-change-me";

const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24;
const SUPERVISOR_SESSION_MAX_AGE = 60 * 60 * 12;
const SUPERADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

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
