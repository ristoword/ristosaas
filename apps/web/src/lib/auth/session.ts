import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { NextRequest, NextResponse } from "next/server";
import {
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SESSION_MAX_AGE_SUPERADMIN_SECONDS,
  SESSION_MAX_AGE_SUPERVISOR_SECONDS,
  getJwtSecret,
  isSecureCookieEnvironment,
} from "@/lib/auth/constants";
import type { PublicUser } from "@/lib/auth/types";

type SessionClaims = {
  userId: string;
  tenantId?: string;
  role: string;
  username: string;
  name: string;
  email: string;
  tokenType?: "access" | "refresh";
  sessionVersion?: number;
  mustChangePassword?: boolean;
  jti?: string;
};

export function createSessionToken(payload: SessionClaims) {
  const jti = payload.jti ?? randomUUID();
  return {
    token: jwt.sign({ ...payload, tokenType: "access", jti }, getJwtSecret(), {
      expiresIn: getSessionMaxAgeSeconds(payload.role),
    }),
    jti,
    expiresInSeconds: getSessionMaxAgeSeconds(payload.role),
  };
}

export function createRefreshToken(payload: SessionClaims) {
  const jti = payload.jti ?? randomUUID();
  return {
    token: jwt.sign({ ...payload, tokenType: "refresh", jti }, getJwtSecret(), {
      expiresIn: REFRESH_MAX_AGE_SECONDS,
    }),
    jti,
    expiresInSeconds: REFRESH_MAX_AGE_SECONDS,
  };
}

export function verifySessionToken(token: string) {
  return verifyToken(token, "access");
}

export function verifyRefreshToken(token: string) {
  return verifyToken(token, "refresh");
}

function verifyToken(token: string, expectedType: "access" | "refresh") {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || typeof decoded !== "object") return null;
    const userId = "userId" in decoded ? String(decoded.userId) : null;
    const tenantId = "tenantId" in decoded ? String(decoded.tenantId) : null;
    const role = "role" in decoded ? String(decoded.role) : null;
    const username = "username" in decoded ? String(decoded.username) : null;
    const name = "name" in decoded ? String(decoded.name) : null;
    const email = "email" in decoded ? String(decoded.email) : null;
    const tokenType =
      "tokenType" in decoded && (decoded.tokenType === "access" || decoded.tokenType === "refresh")
        ? decoded.tokenType
        : null;
    const sessionVersion = "sessionVersion" in decoded ? Number(decoded.sessionVersion) : 0;
    const mustChangePassword = "mustChangePassword" in decoded ? Boolean(decoded.mustChangePassword) : false;
    const jti = "jti" in decoded && decoded.jti ? String(decoded.jti) : null;
    if (!userId || !role || !username || !name || !email) return null;
    if (!tokenType || tokenType !== expectedType) return null;
    if (Number.isNaN(sessionVersion) || sessionVersion < 0) return null;
    return { userId, tenantId, role, username, name, email, tokenType, sessionVersion, mustChangePassword, jti };
  } catch {
    return null;
  }
}

export function getRequestUser(req: NextRequest): PublicUser | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = verifySessionToken(token);
  if (!claims) return null;
  const user: PublicUser = {
    id: claims.userId,
    tenantId: claims.tenantId ?? undefined,
    role: claims.role as PublicUser["role"],
    username: claims.username,
    name: claims.name,
    email: claims.email,
    sessionVersion: claims.sessionVersion ?? 0,
    mustChangePassword: !!claims.mustChangePassword,
    isLocked: false,
    jti: claims.jti,
  };
  return user;
}

type CookieSetOptions = { jti?: string };

export function setSessionCookie(res: NextResponse, payload: SessionClaims, opts?: CookieSetOptions) {
  const maxAge = getSessionMaxAgeSeconds(payload.role);
  const { token } = createSessionToken({ ...payload, jti: opts?.jti ?? payload.jti });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge,
  });
}

export function setRefreshCookie(res: NextResponse, payload: SessionClaims, opts?: CookieSetOptions) {
  const { token } = createRefreshToken({ ...payload, jti: opts?.jti ?? payload.jti });
  res.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export function setAuthCookies(res: NextResponse, payload: SessionClaims): { accessJti: string; refreshJti: string; accessExpiresAt: Date; refreshExpiresAt: Date } {
  const access = createSessionToken(payload);
  const refresh = createRefreshToken(payload);
  res.cookies.set(SESSION_COOKIE, access.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge: access.expiresInSeconds,
  });
  res.cookies.set(REFRESH_COOKIE, refresh.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge: refresh.expiresInSeconds,
  });
  const now = Date.now();
  return {
    accessJti: access.jti,
    refreshJti: refresh.jti,
    accessExpiresAt: new Date(now + access.expiresInSeconds * 1000),
    refreshExpiresAt: new Date(now + refresh.expiresInSeconds * 1000),
  };
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge: 0,
  });
}

export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge: 0,
  });
}

function getSessionMaxAgeSeconds(role: string) {
  if (role === "super_admin") return SESSION_MAX_AGE_SUPERADMIN_SECONDS;
  if (role === "owner" || role === "supervisor") return SESSION_MAX_AGE_SUPERVISOR_SECONDS;
  return SESSION_MAX_AGE_SECONDS;
}
