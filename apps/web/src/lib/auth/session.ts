import jwt from "jsonwebtoken";
import type { NextRequest, NextResponse } from "next/server";
import { findUserById, sanitizeUser } from "@/lib/auth/users.store";
import { JWT_SECRET, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";

type SessionClaims = {
  userId: string;
  role: string;
};

export function createSessionToken(payload: SessionClaims) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySessionToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== "object") return null;
    const userId = "userId" in decoded ? String(decoded.userId) : null;
    const role = "role" in decoded ? String(decoded.role) : null;
    if (!userId || !role) return null;
    return { userId, role };
  } catch {
    return null;
  }
}

export function getRequestUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = verifySessionToken(token);
  if (!claims) return null;
  const user = findUserById(claims.userId);
  if (!user) return null;
  return sanitizeUser(user);
}

export function setSessionCookie(res: NextResponse, payload: SessionClaims) {
  const token = createSessionToken(payload);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
