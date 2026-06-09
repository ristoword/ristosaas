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
  "/menu/",
  "/t/",
  "/r/",
  "/clock",
  "/gestionale-ristorante-hotel-integrato",
  "/gestionale-ristorante",
  "/blog",
  "/en",
  "/nl",
  "/sitemap.xml",
  "/robots.txt",
  "/api/auth/login",
  "/api/auth/refresh",
];
const INTERNAL_ONLY = ["/licenses", "/stripe", "/email-settings", "/super-admin", "/dev-access"];

type Gates = { maintenanceMode: boolean; tenantBlocked: boolean };
let gatesCache: { key: string; value: Gates; exp: number } = {
  key: "",
  value: { maintenanceMode: false, tenantBlocked: false },
  exp: 0,
};

const SESSION_VERSION_CACHE_MS = 60_000;
const sessionVersionCache = new Map<string, { version: number; exp: number }>();

async function isSessionVersionStale(
  origin: string,
  userId: string,
  tokenVersion: number,
  cookie: string,
): Promise<boolean> {
  const now = Date.now();
  const cached = sessionVersionCache.get(userId);
  if (cached && now < cached.exp) {
    return cached.version !== tokenVersion;
  }
  try {
    const url = new URL("/api/auth/session-valid", origin);
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { cookie: `${SESSION_COOKIE}=${cookie}` },
      signal: AbortSignal.timeout(3000),
    });
    if (res.status === 401) {
      sessionVersionCache.set(userId, { version: -1, exp: now + SESSION_VERSION_CACHE_MS });
      return true;
    }
    sessionVersionCache.set(userId, { version: tokenVersion, exp: now + SESSION_VERSION_CACHE_MS });
    return false;
  } catch {
    return false;
  }
}

async function fetchPlatformGates(origin: string, tenantId: string | null): Promise<Gates> {
  const key = tenantId ?? "";
  const now = Date.now();
  if (gatesCache.key === key && now < gatesCache.exp) return gatesCache.value;
  try {
    const url = new URL("/api/health/gates", origin);
    if (tenantId) url.searchParams.set("tenantId", tenantId);
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "x-middleware-internal": "1" },
    });
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

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function withRequestId(res: NextResponse, requestId: string) {
  res.headers.set("x-request-id", requestId);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
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
      const targetUrl = req.nextUrl.clone();
      targetUrl.pathname = session.role === "reseller" ? "/controllo-vendite" : "/dashboard";
      return redirectWithRequestId(targetUrl, requestId);
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
    // Solo POST crea-ordine da menu pubblico (senza sessione). GET /api/orders resta protetto.
    if (pathname === "/api/orders" && req.method === "POST") return nextWithRequestId(req, requestId);
    if (!user) return jsonWithRequestId({ error: "Unauthorized" }, { status: 401 }, requestId);

    if (
      !pathname.startsWith("/api/auth/") &&
      await isSessionVersionStale(req.nextUrl.origin, user.userId, user.sessionVersion, token!)
    ) {
      return jsonWithRequestId({ error: "Session expired. Please login again." }, { status: 401 }, requestId);
    }

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

  if (
    pathname !== "/login" &&
    pathname !== "/change-password" &&
    await isSessionVersionStale(req.nextUrl.origin, user.userId, user.sessionVersion, token!)
  ) {
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

  // Reseller can only access their portal — redirect everything else to it
  if (user.role === "reseller" && pathname !== "/controllo-vendite" && !pathname.startsWith("/api/")) {
    const resellerUrl = req.nextUrl.clone();
    resellerUrl.pathname = "/controllo-vendite";
    return redirectWithRequestId(resellerUrl, requestId);
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webm|mp4|ogg)$).*)"],
};
