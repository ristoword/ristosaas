import { NextRequest, NextResponse } from "next/server";
import { err, body } from "@/lib/api/helpers";
import { setSessionCookie } from "@/lib/auth/session";
import { sanitizeUser, validateUserCredentials } from "@/lib/auth/users.store";

const attempts = new Map<string, { count: number; lockedUntil: number }>();

export async function POST(req: NextRequest) {
  const { username, password } = await body<{ username: string; password: string }>(req);
  if (!username || !password) return err("username and password required");

  const attempt = attempts.get(username) || { count: 0, lockedUntil: 0 };
  if (attempt.lockedUntil > Date.now()) {
    const secs = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
    return err(`Account bloccato. Riprova tra ${secs}s.`, 429);
  }

  const user = validateUserCredentials(username, password);
  if (!user) {
    attempt.count++;
    if (attempt.count >= 5) attempt.lockedUntil = Date.now() + 5 * 60 * 1000;
    attempts.set(username, attempt);
    return err(`Credenziali errate. Tentativo ${attempt.count}/5.`, 401);
  }

  attempts.delete(username);

  const safeUser = sanitizeUser(user);

  const res = NextResponse.json({
    user: safeUser,
  });

  setSessionCookie(res, { userId: user.id, role: user.role });

  return res;
}
