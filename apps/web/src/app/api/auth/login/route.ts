import { NextRequest, NextResponse } from "next/server";
import { err, body } from "@/lib/api/helpers";
import { setSessionCookie } from "@/lib/auth/session";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";

export async function POST(req: NextRequest) {
  const { username, password } = await body<{ username: string; password: string }>(req);
  if (!username || !password) return err("username and password required");

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
  const safeUser = authUsersRepository.sanitizeUser(validatedUser);

  const res = NextResponse.json({
    user: safeUser,
  });

  setSessionCookie(res, {
    userId: validatedUser.id,
    role: validatedUser.role,
    username: validatedUser.username,
    name: validatedUser.name,
    email: validatedUser.email,
    mustChangePassword: !!validatedUser.mustChangePassword,
  });

  return res;
}
