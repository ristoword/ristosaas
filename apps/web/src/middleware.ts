import { NextResponse, type NextRequest } from "next/server";
import { hasVerticalEnabled } from "@/core/tenant/platform-config";
import { canAccessWithRole, getApiRequiredRoles, isPublicApiPath } from "@/lib/auth/rbac";
import { SESSION_COOKIE, verifyEdgeSessionToken } from "@/lib/auth/session.edge";

const PUBLIC = ["/login", "/change-password", "/setup", "/maintenance", "/api/auth/login", "/api/auth/refresh"];
const INTERNAL_ONLY = ["/licenses", "/stripe", "/websocket", "/super-admin", "/dev-access"];
const RESTAURANT_ONLY = ["/rooms", "/sala-fullscreen", "/cucina", "/pizzeria", "/bar", "/cassa", "/chiusura", "/asporto", "/prenotazioni", "/magazzino", "/fornitori", "/menu-admin", "/daily-menu", "/food-cost", "/catering"];
const HOTEL_ONLY = ["/hotel"];

async function verifySessionVersion(req: NextRequest) {
  const cookie = req.headers.get("cookie");
  if (!cookie) return false;
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/auth/session-valid`, {
      method: "GET",
      headers: { cookie },
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
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/auth/license-valid`, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyEdgeSessionToken(token) : null;
  const user = session;

  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) return NextResponse.next();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const validSession = await verifySessionVersion(req);
    if (!validSession) return NextResponse.json({ error: "Session expired. Please login again." }, { status: 401 });

    if (shouldCheckLicenseForApi(pathname)) {
      const validLicense = await verifyLicense(req);
      if (!validLicense) return NextResponse.json({ error: "License inactive" }, { status: 402 });
    }

    const requiredRoles = getApiRequiredRoles(pathname);
    if (requiredRoles && !canAccessWithRole(user.role, requiredRoles)) {
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

  const validSession = await verifySessionVersion(req);
  if (!validSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (shouldCheckLicenseForPage(pathname)) {
    const validLicense = await verifyLicense(req);
    if (!validLicense) {
      const licenseUrl = req.nextUrl.clone();
      licenseUrl.pathname = "/licenses";
      return NextResponse.redirect(licenseUrl);
    }
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
