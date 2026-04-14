import jwt from "jsonwebtoken";
import type { NextRequest, NextResponse } from "next/server";
import { JWT_SECRET, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";
import type { PublicUser } from "@/lib/auth/types";

type SessionClaims = {
  userId: string;
  role: string;
  username: string;
  name: string;
  email: string;
  mustChangePassword?: boolean;
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
    const username = "username" in decoded ? String(decoded.username) : null;
    const name = "name" in decoded ? String(decoded.name) : null;
    const email = "email" in decoded ? String(decoded.email) : null;
    const mustChangePassword = "mustChangePassword" in decoded ? Boolean(decoded.mustChangePassword) : false;
    if (!userId || !role || !username || !name || !email) return null;
    return { userId, role, username, name, email, mustChangePassword };
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
    mustChangePassword: !!claims.mustChangePassword,
    isLocked: false,
  };
  return user;
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
