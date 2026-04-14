import { NextResponse, type NextRequest } from "next/server";
import { canAccessWithRole, getApiRequiredRoles, isPublicApiPath } from "@/lib/auth/rbac";
import { SESSION_COOKIE, verifyEdgeSessionToken } from "@/lib/auth/session.edge";
import { getOrCreateRequestId } from "@/lib/observability/request-context";

const PUBLIC = ["/login", "/change-password", "/setup", "/maintenance", "/api/auth/login", "/api/auth/refresh", "/api/health"];
const INTERNAL_ONLY = ["/licenses", "/stripe", "/websocket", "/super-admin", "/dev-access"];

async function verifySessionVersion(req: NextRequest) {
  const cookie = req.headers.get("cookie");
  if (!cookie) return false;
  const session = req.cookies.get(SESSION_COOKIE)?.value ? await verifyEdgeSessionToken(req.cookies.get(SESSION_COOKIE)!.value) : null;
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/auth/session-valid`, {
      method: "GET",
      headers: {
        cookie,
        ...(session?.tenantId ? { "x-tenant-id": session.tenantId } : {}),
      },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

const LICENSE_API_BYPASS = ["/api/auth/", "/api/billing/", "/api/admin/licenses"];
const LICENSE_PAGE_BYPASS = ["/login", "/change-password", "/licenses", "/stripe", "/super-admin"];

function shouldCheckLicenseForApi(pathname: string) {
  return !LICENSE_API_BYPASS.some((prefix) => pathname.startsWith(prefix));
}

function shouldCheckLicenseForPage(pathname: string) {
  return !LICENSE_PAGE_BYPASS.some((prefix) => pathname.startsWith(prefix));
}

async function verifyLicense(req: NextRequest) {
  const cookie = req.headers.get("cookie");
  if (!cookie) return false;
  const session = req.cookies.get(SESSION_COOKIE)?.value ? await verifyEdgeSessionToken(req.cookies.get(SESSION_COOKIE)!.value) : null;
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/auth/license-valid`, {
      method: "GET",
      headers: {
        cookie,
        ...(session?.tenantId ? { "x-tenant-id": session.tenantId } : {}),
      },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyEntitlements(req: NextRequest, pathname: string) {
  const cookie = req.headers.get("cookie");
  if (!cookie) return { ok: false, status: 401 };
  const session = req.cookies.get(SESSION_COOKIE)?.value ? await verifyEdgeSessionToken(req.cookies.get(SESSION_COOKIE)!.value) : null;
  try {
    const url = new URL("/api/auth/entitlements-valid", req.nextUrl.origin);
    url.searchParams.set("path", pathname);
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        cookie,
        ...(session?.tenantId ? { "x-tenant-id": session.tenantId } : {}),
      },
      cache: "no-store",
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 500 };
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

  if (PUBLIC.some((p) => pathname.startsWith(p))) return nextWithRequestId(req, requestId);
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return nextWithRequestId(req, requestId);

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyEdgeSessionToken(token) : null;
  const user = session;

  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) return nextWithRequestId(req, requestId);
    if (!user) return jsonWithRequestId({ error: "Unauthorized" }, { status: 401 }, requestId);

    const validSession = await verifySessionVersion(req);
    if (!validSession) return jsonWithRequestId({ error: "Session expired. Please login again." }, { status: 401 }, requestId);

    if (shouldCheckLicenseForApi(pathname)) {
      const validLicense = await verifyLicense(req);
      if (!validLicense) return jsonWithRequestId({ error: "License inactive" }, { status: 402 }, requestId);
      const entitlements = await verifyEntitlements(req, pathname);
      if (!entitlements.ok) {
        const status = entitlements.status === 403 ? 403 : 402;
        const error = status === 403 ? "Feature not enabled by license plan" : "License limits exceeded";
        return jsonWithRequestId({ error }, { status }, requestId);
      }
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
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-request-id", requestId);
    requestHeaders.set("x-user-id", user.userId);
    requestHeaders.set("x-user-role", user.role);
    if (user.tenantId) requestHeaders.set("x-tenant-id", user.tenantId);
    const res = withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
    res.headers.set("x-user-id", user.userId);
    res.headers.set("x-user-role", user.role);
    if (user.tenantId) res.headers.set("x-tenant-id", user.tenantId);
    return withRequestId(res, requestId);
  }

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return redirectWithRequestId(loginUrl, requestId);
  }

  const validSession = await verifySessionVersion(req);
  if (!validSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return redirectWithRequestId(loginUrl, requestId);
  }

  if (shouldCheckLicenseForPage(pathname)) {
    const validLicense = await verifyLicense(req);
    if (!validLicense) {
      const licenseUrl = req.nextUrl.clone();
      licenseUrl.pathname = "/licenses";
      return redirectWithRequestId(licenseUrl, requestId);
    }
    const entitlements = await verifyEntitlements(req, pathname);
    if (!entitlements.ok) {
      const fallbackUrl = req.nextUrl.clone();
      fallbackUrl.pathname = entitlements.status === 403 ? "/dashboard" : "/licenses";
      return redirectWithRequestId(fallbackUrl, requestId);
    }
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

  return nextWithRequestId(req, requestId);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
