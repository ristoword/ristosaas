import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api/helpers";
import { REFRESH_COOKIE } from "@/lib/auth/constants";
import { clearRefreshCookie, clearSessionCookie, setAuthCookies, verifyRefreshToken } from "@/lib/auth/session";
import { authUsersRepository } from "@/lib/db/repositories/auth-users.repository";
import { isMaintenanceMode, isTenantBlocked } from "@/lib/db/repositories/platform.repository";

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

  if (user.role !== "super_admin") {
    if (await isMaintenanceMode()) {
      const res = NextResponse.json({ error: "Piattaforma in manutenzione. Riprova più tardi." }, { status: 503 });
      clearSessionCookie(res);
      clearRefreshCookie(res);
      return res;
    }
    if (await isTenantBlocked(user.tenantId)) {
      const res = NextResponse.json({ error: "Struttura sospesa. Contatta l'assistenza." }, { status: 403 });
      clearSessionCookie(res);
      clearRefreshCookie(res);
      return res;
    }
  }

  const safeUser = authUsersRepository.sanitizeUser(user);
  const res = NextResponse.json({ user: safeUser });
  setAuthCookies(res, {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    username: user.username,
    name: user.name,
    email: user.email,
    sessionVersion: user.sessionVersion,
    mustChangePassword: !!user.mustChangePassword,
  });
  return res;
}
