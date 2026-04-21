import { NextRequest, NextResponse } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth/constants";
import { clearRefreshCookie, clearSessionCookie, verifyRefreshToken, verifySessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/session.edge";
import { userSessionsRepository } from "@/lib/db/repositories/user-sessions.repository";
import { logger } from "@/lib/observability/logger";

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  const jtisToRevoke: Array<{ jti: string; userId: string }> = [];
  if (sessionToken) {
    const claims = verifySessionToken(sessionToken);
    if (claims?.jti && claims.userId) jtisToRevoke.push({ jti: claims.jti, userId: claims.userId });
  }
  if (refreshToken) {
    const claims = verifyRefreshToken(refreshToken);
    if (claims?.jti && claims.userId) jtisToRevoke.push({ jti: claims.jti, userId: claims.userId });
  }

  await Promise.all(
    jtisToRevoke.map((entry) =>
      userSessionsRepository.revoke(entry.jti, entry.userId).catch((error) => {
        logger.warn("session_logout_revoke_failed", {
          jti: entry.jti,
          error: error instanceof Error ? error.message : String(error),
        });
      }),
    ),
  );

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  clearRefreshCookie(res);
  return res;
}
