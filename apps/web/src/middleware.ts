import { NextResponse, type NextRequest } from "next/server";
import { hasVerticalEnabled } from "@/core/tenant/platform-config";
import { SESSION_COOKIE, verifyEdgeSessionToken } from "@/lib/auth/session.edge";
import type { UserRole } from "@/lib/auth/types";

const PUBLIC = ["/login", "/change-password", "/setup", "/maintenance", "/api/auth/login"];
const PUBLIC_API = ["/api/billing/stripe/webhook"];
const INTERNAL_ONLY = ["/licenses", "/stripe", "/websocket", "/super-admin", "/dev-access"];
const RESTAURANT_ONLY = ["/rooms", "/sala-fullscreen", "/cucina", "/pizzeria", "/bar", "/cassa", "/chiusura", "/asporto", "/prenotazioni", "/magazzino", "/fornitori", "/menu-admin", "/daily-menu", "/food-cost", "/catering"];
const HOTEL_ONLY = ["/hotel"];
const API_ROLE_RULES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/api/admin", roles: ["super_admin"] },
  { prefix: "/api/billing/overview", roles: ["owner", "super_admin"] },
  { prefix: "/api/reports", roles: ["owner", "super_admin", "supervisor", "cassa"] },
];

function canAccessWithRole(role: string, required: UserRole[]) {
  if (role === "owner" || role === "super_admin") return true;
  return required.includes(role as UserRole);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyEdgeSessionToken(token) : null;
  const user = session;

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rule = API_ROLE_RULES.find((item) => pathname.startsWith(item.prefix));
    if (rule && !canAccessWithRole(user.role, rule.roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      user.mustChangePassword &&
      !pathname.startsWith("/api/auth/change-password") &&
      !pathname.startsWith("/api/auth/me") &&
      !pathname.startsWith("/api/auth/logout")
    ) {
      return NextResponse.json({ error: "Password change required" }, { status: 403 });
    }
    const res = NextResponse.next();
    res.headers.set("x-user-id", user.userId);
    res.headers.set("x-user-role", user.role);
    return res;
  }

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user.mustChangePassword && pathname !== "/change-password") {
    const changeUrl = req.nextUrl.clone();
    changeUrl.pathname = "/change-password";
    return NextResponse.redirect(changeUrl);
  }

  if (INTERNAL_ONLY.some((p) => pathname.startsWith(p)) && user.role !== "super_admin") {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  if (RESTAURANT_ONLY.some((p) => pathname.startsWith(p)) && !hasVerticalEnabled("restaurant")) {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  if (HOTEL_ONLY.some((p) => pathname.startsWith(p)) && !hasVerticalEnabled("hotel")) {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
