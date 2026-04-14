import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { getRequestUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";

type LicenseStatus = "trial" | "active" | "expired" | "suspended";
type FeatureCode =
  | "restaurant"
  | "hotel"
  | "integration_room_charge"
  | "integration_unified_folio"
  | "integration_meal_plans";
type ProductPlan = "restaurant_only" | "hotel_only" | "all_included";

const VALID_LICENSE_STATUSES: LicenseStatus[] = ["trial", "active"];

const PLAN_FEATURES: Record<ProductPlan, FeatureCode[]> = {
  restaurant_only: ["restaurant"],
  hotel_only: ["hotel"],
  all_included: ["restaurant", "hotel", "integration_room_charge", "integration_unified_folio", "integration_meal_plans"],
};

const RESTAURANT_API_PREFIXES = [
  "/api/orders",
  "/api/kitchen",
  "/api/menu",
  "/api/warehouse",
  "/api/rooms",
  "/api/tables",
  "/api/bookings",
  "/api/suppliers",
  "/api/catering",
  "/api/asporto",
  "/api/archivio",
];

const RESTAURANT_PAGE_PREFIXES = [
  "/rooms",
  "/sala-fullscreen",
  "/cucina",
  "/pizzeria",
  "/bar",
  "/cassa",
  "/chiusura",
  "/asporto",
  "/prenotazioni",
  "/magazzino",
  "/fornitori",
  "/menu-admin",
  "/daily-menu",
  "/food-cost",
  "/catering",
];

function getRequiredFeatures(pathname: string): FeatureCode[] {
  if (pathname.startsWith("/api/hotel") || pathname.startsWith("/hotel")) return ["hotel"];
  if (pathname.startsWith("/api/integration/room-charge")) return ["integration_room_charge"];
  if (pathname.startsWith("/api/integration/folios") || pathname.startsWith("/api/integration/charges") || pathname.startsWith("/hotel/folio")) {
    return ["integration_unified_folio"];
  }
  if (RESTAURANT_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || RESTAURANT_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return ["restaurant"];
  }
  return [];
}

export async function GET(req: NextRequest) {
  const user = getRequestUser(req);
  if (!user) return err("Unauthorized", 401);

  // Super admin always bypasses commercial constraints for recovery/operations.
  if (user.role === "super_admin") {
    return ok({ valid: true, bypass: true, reason: "super_admin" as const });
  }

  const tenantId = getTenantId();
  const requestedPath = req.nextUrl.searchParams.get("path") || "/";

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      features: {
        where: { enabled: true },
        select: { code: true },
      },
      license: {
        select: { status: true, seats: true, usedSeats: true },
      },
    },
  });

  if (!tenant || !tenant.license) return err("License not found", 402);
  if (!VALID_LICENSE_STATUSES.includes(tenant.license.status as LicenseStatus)) return err("License inactive", 402);
  if (tenant.license.usedSeats > tenant.license.seats) return err("License seats exceeded", 402);

  const enabledFeatures = new Set<FeatureCode>([
    ...PLAN_FEATURES[(tenant.plan as ProductPlan) || "all_included"],
    ...tenant.features.map((feature) => feature.code as FeatureCode),
  ]);
  const required = getRequiredFeatures(requestedPath);
  const missing = required.filter((feature) => !enabledFeatures.has(feature));

  if (missing.length > 0) {
    return err(`Feature not enabled: ${missing.join(", ")}`, 403);
  }

  return ok({
    valid: true,
    status: tenant.license.status,
    seats: tenant.license.seats,
    usedSeats: tenant.license.usedSeats,
    requiredFeatures: required,
    enabledFeatures: [...enabledFeatures],
  });
}
