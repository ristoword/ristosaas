import { jwtVerify } from "jose/jwt/verify";
import { JWT_SECRET, REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/auth/constants";

const secret = new TextEncoder().encode(JWT_SECRET);

export async function verifyEdgeSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId ? String(payload.userId) : null;
    const role = payload.role ? String(payload.role) : null;
    const username = payload.username ? String(payload.username) : null;
    const name = payload.name ? String(payload.name) : null;
    const email = payload.email ? String(payload.email) : null;
    const tokenType = payload.tokenType === "refresh" ? "refresh" : "access";
    const sessionVersion = payload.sessionVersion ? Number(payload.sessionVersion) : 0;
    const mustChangePassword = payload.mustChangePassword ? Boolean(payload.mustChangePassword) : false;
    if (tokenType !== "access") return null;
    if (Number.isNaN(sessionVersion) || sessionVersion < 0) return null;
    if (!userId || !role || !username || !name || !email) return null;
    return { userId, role, username, name, email, tokenType, sessionVersion, mustChangePassword };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
export { REFRESH_COOKIE };
