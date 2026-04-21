import { NextResponse, type NextRequest } from "next/server";
import { canAccessWithRole, getApiRequiredRoles, isPublicApiPath } from "@/lib/auth/rbac";
import { SESSION_COOKIE, verifyEdgeSessionToken } from "@/lib/auth/session.edge";
import { getOrCreateRequestId } from "@/lib/observability/request-context";

const PUBLIC = [
  "/login",
  "/change-password",
  "/setup",
  "/maintenance",
  "/signup",
  "/t/",
  "/gestionale-ristorante-hotel-integrato",
  "/gestionale-ristorante",
  "/blog",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/health",
];
const INTERNAL_ONLY = ["/licenses", "/stripe", "/websocket", "/email-settings", "/super-admin", "/dev-access"];

type Gates = { maintenanceMode: boolean; tenantBlocked: boolean };
let gatesCache: { key: string; value: Gates; exp: number } = {
  key: "",
  value: { maintenanceMode: false, tenantBlocked: false },
  exp: 0,
};

async function fetchPlatformGates(origin: string, tenantId: string | null): Promise<Gates> {
  const key = tenantId ?? "";
  const now = Date.now();
  if (gatesCache.key === key && now < gatesCache.exp) return gatesCache.value;
  try {
    const url = new URL("/api/health/gates", origin);
    if (tenantId) url.searchParams.set("tenantId", tenantId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as Partial<Gates>;
    const value: Gates = {
      maintenanceMode: !!data.maintenanceMode,
      tenantBlocked: !!data.tenantBlocked,
    };
    gatesCache = { key, value, exp: now + 5000 };
    return value;
  } catch {
    return { maintenanceMode: false, tenantBlocked: false };
  }
}

function withRequestId(res: NextResponse, requestId: string) {
  res.headers.set("x-request-id", requestId);
  return res;
}

function nextWithRequestId(req: NextRequest, requestId: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
}

function jsonWithRequestId(body: unknown, init: ResponseInit, requestId: string) {
  return withRequestId(NextResponse.json(body, init), requestId);
}

function redirectWithRequestId(url: URL, requestId: string) {
  return withRequestId(NextResponse.redirect(url), requestId);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = getOrCreateRequestId(req.headers);

  // Public landing at "/" — if the user is already authenticated, send them
  // straight to the dashboard to preserve the old `Home → redirect("/dashboard")`
  // UX for signed-in traffic. Anonymous visitors see the marketing page.
  if (pathname === "/") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifyEdgeSessionToken(token) : null;
    if (session) {
      const dashUrl = req.nextUrl.clone();
      dashUrl.pathname = "/dashboard";
      return redirectWithRequestId(dashUrl, requestId);
    }
    return nextWithRequestId(req, requestId);
  }

  if (PUBLIC.some((p) => pathname.startsWith(p))) return nextWithRequestId(req, requestId);
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return nextWithRequestId(req, requestId);

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyEdgeSessionToken(token) : null;
  const user = session;

  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) return nextWithRequestId(req, requestId);
    if (!user) return jsonWithRequestId({ error: "Unauthorized" }, { status: 401 }, requestId);

    const requiredRoles = getApiRequiredRoles(pathname);
    if (requiredRoles && !canAccessWithRole(user.role, requiredRoles)) {
      return jsonWithRequestId({ error: "Forbidden" }, { status: 403 }, requestId);
    }

    if (
      user.mustChangePassword &&
      !pathname.startsWith("/api/auth/change-password") &&
      !pathname.startsWith("/api/auth/me") &&
      !pathname.startsWith("/api/auth/logout")
    ) {
      return jsonWithRequestId({ error: "Password change required" }, { status: 403 }, requestId);
    }

    if (user.role !== "super_admin") {
      const gates = await fetchPlatformGates(req.nextUrl.origin, user.tenantId);
      if (gates.maintenanceMode) {
        const allow =
          pathname.startsWith("/api/auth/logout") ||
          pathname.startsWith("/api/auth/change-password") ||
          pathname.startsWith("/api/auth/me");
        if (!allow) {
          return jsonWithRequestId({ error: "Piattaforma in manutenzione." }, { status: 503 }, requestId);
        }
      }
      if (gates.tenantBlocked) {
        const allow = pathname.startsWith("/api/auth/logout") || pathname.startsWith("/api/auth/me");
        if (!allow) {
          return jsonWithRequestId({ error: "Struttura sospesa." }, { status: 403 }, requestId);
        }
      }
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-request-id", requestId);
    requestHeaders.set("x-user-id", user.userId);
    requestHeaders.set("x-user-role", user.role);
    if (user.tenantId) requestHeaders.set("x-tenant-id", user.tenantId);
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
  }

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return redirectWithRequestId(loginUrl, requestId);
  }

  if (user.mustChangePassword && pathname !== "/change-password") {
    const changeUrl = req.nextUrl.clone();
    changeUrl.pathname = "/change-password";
    return redirectWithRequestId(changeUrl, requestId);
  }

  if (INTERNAL_ONLY.some((p) => pathname.startsWith(p)) && user.role !== "super_admin") {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return redirectWithRequestId(dashboardUrl, requestId);
  }

  if (user.role !== "super_admin") {
    const gates = await fetchPlatformGates(req.nextUrl.origin, user.tenantId);
    if (gates.maintenanceMode && !pathname.startsWith("/maintenance")) {
      const u = req.nextUrl.clone();
      u.pathname = "/maintenance";
      u.searchParams.delete("reason");
      return redirectWithRequestId(u, requestId);
    }
    if (gates.tenantBlocked && !pathname.startsWith("/maintenance")) {
      const u = req.nextUrl.clone();
      u.pathname = "/maintenance";
      u.searchParams.set("reason", "tenant");
      return redirectWithRequestId(u, requestId);
    }
  }

  return nextWithRequestId(req, requestId);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
