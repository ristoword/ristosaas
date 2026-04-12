import { NextResponse, type NextRequest } from "next/server";
import { findUserById } from "@/lib/auth/users.store";
import { SESSION_COOKIE, verifyEdgeSessionToken } from "@/lib/auth/session.edge";

const PUBLIC = ["/login", "/change-password", "/setup", "/maintenance", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyEdgeSessionToken(token) : null;
  const user = session ? findUserById(session.userId) : null;

  if (pathname.startsWith("/api/")) {
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const res = NextResponse.next();
    res.headers.set("x-user-id", user.id);
    res.headers.set("x-user-role", user.role);
    return res;
  }

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
