import { NextRequest, NextResponse } from "next/server";
import { err, body } from "@/lib/api/helpers";
import { setAuthCookies } from "@/lib/auth/session";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";
import { isMaintenanceMode, isTenantBlocked } from "@/lib/db/repositories/platform.repository";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const { username, password } = await body<{ username: string; password: string }>(req);
  if (!username || !password) return err("username and password required");

  // Rate limit by (IP + username): mitigates credential stuffing/brute force
  // independently of user account lockout (which only applies to existing users).
  const ip = clientIpFromRequest(req);
  const rl = await applyRateLimit(`${ip}|${username.toLowerCase()}`, {
    bucket: "auth:login",
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: `Troppi tentativi. Riprova tra ${Math.ceil(rl.resetInMs / 1000)}s.` },
      { status: 429 },
    );
    for (const [k, v] of Object.entries(rateLimitHeaders(rl))) res.headers.set(k, v);
    return res;
  }

  const existing = await authUsersRepository.findByUsername(username);
  if (existing && existing.lockedUntil && existing.lockedUntil.getTime() > Date.now()) {
    const secs = Math.ceil((existing.lockedUntil.getTime() - Date.now()) / 1000);
    return err(`Account bloccato. Riprova tra ${secs}s.`, 429);
  }

  const validatedUser = existing
    ? await authUsersRepository.validateCredentials(username, password)
    : null;

  if (!validatedUser) {
    const failed = await authUsersRepository.registerFailedLogin(username);
    if (failed.found && failed.locked) return err(`Account bloccato. Riprova tra ${failed.lockedSeconds}s.`, 429);
    return err(`Credenziali errate. Tentativo ${failed.attempt || 1}/5.`, 401);
  }

  await authUsersRepository.clearLoginFailures(validatedUser.id);

  if (validatedUser.role !== "super_admin") {
    if (await isMaintenanceMode()) {
      return err("Piattaforma in manutenzione. Riprova più tardi.", 503);
    }
    if (await isTenantBlocked(validatedUser.tenantId)) {
      return err("Struttura sospesa. Contatta l'assistenza.", 403);
    }
  }

  const safeUser = authUsersRepository.sanitizeUser(validatedUser);

  const res = NextResponse.json({
    user: safeUser,
  });

  setAuthCookies(res, {
    userId: validatedUser.id,
    tenantId: validatedUser.tenantId,
    role: validatedUser.role,
    username: validatedUser.username,
    name: validatedUser.name,
    email: validatedUser.email,
    sessionVersion: validatedUser.sessionVersion,
    mustChangePassword: !!validatedUser.mustChangePassword,
  });

  return res;
}
