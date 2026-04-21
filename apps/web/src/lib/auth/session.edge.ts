import { jwtVerify } from "jose/jwt/verify";
import { REFRESH_COOKIE, SESSION_COOKIE, getJwtSecret } from "@/lib/auth/constants";

export async function verifyEdgeSessionToken(token: string) {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId ? String(payload.userId) : null;
    const tenantId = payload.tenantId ? String(payload.tenantId) : null;
    const role = payload.role ? String(payload.role) : null;
    const username = payload.username ? String(payload.username) : null;
    const name = payload.name ? String(payload.name) : null;
    const email = payload.email ? String(payload.email) : null;
    const tokenType = payload.tokenType === "access" || payload.tokenType === "refresh" ? payload.tokenType : null;
    const sessionVersion = payload.sessionVersion ? Number(payload.sessionVersion) : 0;
    const mustChangePassword = payload.mustChangePassword ? Boolean(payload.mustChangePassword) : false;
    const jti = payload.jti ? String(payload.jti) : null;
    if (!tokenType || tokenType !== "access") return null;
    if (Number.isNaN(sessionVersion) || sessionVersion < 0) return null;
    if (!userId || !role || !username || !name || !email) return null;
    return { userId, tenantId, role, username, name, email, tokenType, sessionVersion, mustChangePassword, jti };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
export { REFRESH_COOKIE };
