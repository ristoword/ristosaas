import { jwtVerify } from "jose/jwt/verify";
import { JWT_SECRET, SESSION_COOKIE } from "@/lib/auth/constants";

const secret = new TextEncoder().encode(JWT_SECRET);

export async function verifyEdgeSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId ? String(payload.userId) : null;
    const role = payload.role ? String(payload.role) : null;
    if (!userId || !role) return null;
    return { userId, role };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
