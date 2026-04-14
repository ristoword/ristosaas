import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api/helpers";
import { REFRESH_COOKIE } from "@/lib/auth/constants";
import { clearRefreshCookie, clearSessionCookie, setAuthCookies, verifyRefreshToken } from "@/lib/auth/session";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return err("Refresh token missing", 401);

  const refreshClaims = verifyRefreshToken(refreshToken);
  if (!refreshClaims) return err("Invalid refresh token", 401);

  const user = await authUsersRepository.findById(refreshClaims.userId);
  if (!user) return err("User not found", 401);
  if (user.sessionVersion !== (refreshClaims.sessionVersion ?? 0)) {
    const res = NextResponse.json({ error: "Session expired. Please login again." }, { status: 401 });
    clearSessionCookie(res);
    clearRefreshCookie(res);
    return res;
  }

  const safeUser = authUsersRepository.sanitizeUser(user);
  const res = NextResponse.json({ user: safeUser });
  setAuthCookies(res, {
    userId: user.id,
    role: user.role,
    username: user.username,
    name: user.name,
    email: user.email,
    sessionVersion: user.sessionVersion,
    mustChangePassword: !!user.mustChangePassword,
  });
  return res;
}
