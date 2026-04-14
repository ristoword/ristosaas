import type { UserRole } from "@/lib/auth/types";

type ApiRule = {
  prefix: string;
  roles: readonly UserRole[];
};

export const PUBLIC_API_PREFIXES = ["/api/billing/stripe/webhook"] as const;

export const API_ROLE_RULES: readonly ApiRule[] = [
  { prefix: "/api/admin", roles: ["super_admin"] },
  { prefix: "/api/billing/overview", roles: ["owner", "super_admin"] },
  { prefix: "/api/reports", roles: ["owner", "super_admin", "supervisor", "cassa"] },
  { prefix: "/api/hotel/front-desk", roles: ["reception", "hotel_manager", "owner", "super_admin"] },
  { prefix: "/api/hotel/housekeeping", roles: ["housekeeping", "hotel_manager", "owner", "super_admin"] },
  { prefix: "/api/hotel/keycards", roles: ["reception", "hotel_manager", "owner", "super_admin"] },
  { prefix: "/api/hotel/rate-plans", roles: ["hotel_manager", "owner", "super_admin"] },
  { prefix: "/api/hotel/rooms", roles: ["reception", "hotel_manager", "housekeeping", "owner", "super_admin"] },
  { prefix: "/api/hotel/reservations", roles: ["reception", "hotel_manager", "owner", "super_admin"] },
  { prefix: "/api/hotel/availability", roles: ["reception", "hotel_manager", "owner", "super_admin"] },
  { prefix: "/api/integration", roles: ["reception", "hotel_manager", "cassa", "sala", "owner", "super_admin"] },
  { prefix: "/api/orders", roles: ["sala", "cucina", "bar", "pizzeria", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/kitchen", roles: ["cucina", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/menu", roles: ["cucina", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/warehouse", roles: ["magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff/shifts/clock", roles: ["staff", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff/shifts", roles: ["supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff", roles: ["supervisor", "owner", "super_admin"] },
  { prefix: "/api/customers", roles: ["reception", "hotel_manager", "sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/bookings", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/rooms", roles: ["sala", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/tables", roles: ["sala", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/suppliers", roles: ["magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/catering", roles: ["owner", "super_admin", "supervisor"] },
  { prefix: "/api/asporto", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/archivio", roles: ["supervisor", "owner", "super_admin", "cassa"] },
] as const;

export function canAccessWithRole(role: string, required: readonly UserRole[]) {
  if (role === "owner" || role === "super_admin") return true;
  return required.includes(role as UserRole);
}

export function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getApiRequiredRoles(pathname: string) {
  const match = API_ROLE_RULES
    .filter((rule) => pathname.startsWith(rule.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match?.roles ?? null;
}
