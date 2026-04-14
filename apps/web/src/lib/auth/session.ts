import jwt from "jsonwebtoken";
import type { NextRequest, NextResponse } from "next/server";
import {
  JWT_SECRET,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SESSION_MAX_AGE_SUPERADMIN_SECONDS,
  SESSION_MAX_AGE_SUPERVISOR_SECONDS,
} from "@/lib/auth/constants";
import type { PublicUser } from "@/lib/auth/types";

type SessionClaims = {
  userId: string;
  role: string;
  username: string;
  name: string;
  email: string;
  tokenType?: "access" | "refresh";
  sessionVersion?: number;
  mustChangePassword?: boolean;
};

export function createSessionToken(payload: SessionClaims) {
  return jwt.sign({ ...payload, tokenType: "access" }, JWT_SECRET, { expiresIn: getSessionMaxAgeSeconds(payload.role) });
}

export function createRefreshToken(payload: SessionClaims) {
  return jwt.sign({ ...payload, tokenType: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_MAX_AGE_SECONDS });
}

export function verifySessionToken(token: string) {
  return verifyToken(token, "access");
}

export function verifyRefreshToken(token: string) {
  return verifyToken(token, "refresh");
}

function verifyToken(token: string, expectedType: "access" | "refresh") {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== "object") return null;
    const userId = "userId" in decoded ? String(decoded.userId) : null;
    const role = "role" in decoded ? String(decoded.role) : null;
    const username = "username" in decoded ? String(decoded.username) : null;
    const name = "name" in decoded ? String(decoded.name) : null;
    const email = "email" in decoded ? String(decoded.email) : null;
    const tokenType =
      "tokenType" in decoded && (decoded.tokenType === "access" || decoded.tokenType === "refresh")
        ? decoded.tokenType
        : "access";
    const sessionVersion = "sessionVersion" in decoded ? Number(decoded.sessionVersion) : 0;
    const mustChangePassword = "mustChangePassword" in decoded ? Boolean(decoded.mustChangePassword) : false;
    if (!userId || !role || !username || !name || !email) return null;
    if (tokenType !== expectedType) return null;
    if (Number.isNaN(sessionVersion) || sessionVersion < 0) return null;
    return { userId, role, username, name, email, tokenType, sessionVersion, mustChangePassword };
  } catch {
    return null;
  }
}

export function getRequestUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = verifySessionToken(token);
  if (!claims) return null;
  const user: PublicUser = {
    id: claims.userId,
    role: claims.role as PublicUser["role"],
    username: claims.username,
    name: claims.name,
    email: claims.email,
    sessionVersion: claims.sessionVersion ?? 0,
    mustChangePassword: !!claims.mustChangePassword,
    isLocked: false,
  };
  return user;
}

export function setSessionCookie(res: NextResponse, payload: SessionClaims) {
  const maxAge = getSessionMaxAgeSeconds(payload.role);
  const token = createSessionToken(payload);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function setRefreshCookie(res: NextResponse, payload: SessionClaims) {
  const token = createRefreshToken(payload);
  res.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export function setAuthCookies(res: NextResponse, payload: SessionClaims) {
  setSessionCookie(res, payload);
  setRefreshCookie(res, payload);
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function getSessionMaxAgeSeconds(role: string) {
  if (role === "super_admin") return SESSION_MAX_AGE_SUPERADMIN_SECONDS;
  if (role === "owner" || role === "supervisor") return SESSION_MAX_AGE_SUPERVISOR_SECONDS;
  return SESSION_MAX_AGE_SECONDS;
}
