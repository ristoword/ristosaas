import type { UserRole } from "@/lib/auth/types";

type ApiRule = {
  prefix: string;
  roles: readonly UserRole[];
};

/**
 * Paths whose prefix match bypasses JWT check in middleware.
 *
 * Keep this list TIGHT and EXPLICIT. Every entry must have its own
 * auth story (HMAC signature, Stripe webhook secret, etc.).
 *
 * New cron / scheduler endpoints must be ADDED here one by one; do NOT
 * add a broad prefix like `/api/jobs/` because it would silently expose
 * any future job route that someone forgets to HMAC-sign.
 */
export const PUBLIC_API_PREFIXES = [
  "/api/billing/stripe/webhook",
  "/api/public/signup",
  "/api/public/table",
  "/api/auth/session-valid",
  "/api/auth/license-valid",
  "/api/auth/entitlements-valid",
  "/api/ai/proposals/schedule/daily",
  "/api/jobs/billing/reconcile-all",
] as const;

/**
 * Matrice unica di verita' per RBAC lato API.
 *
 * Regole d'uso:
 *  - longest prefix wins (match piu' specifico vince)
 *  - il middleware edge usa questa matrice su ogni richiesta `/api/*`
 *  - il guard handler `requireApiUser` legge la stessa matrice se non
 *    viene passato un override esplicito `requiredRoles`
 *  - super_admin passa sempre (bypass globale in canAccessWithRole)
 *  - owner passa sempre tranne quando la regola e' esattamente
 *    ["super_admin"] (vedere canAccessWithRole)
 *
 * Come modificare una regola:
 *  - modificare SOLO questo array; handler e middleware si allineano
 *    automaticamente senza drift
 *  - se un handler ha bisogno di restrizioni LOCALI piu' strette
 *    (es. solo owner anche se la matrice ammette supervisor), passare
 *    `requireApiUser(req, ["owner", "super_admin"])` esplicitamente
 *
 * Ultima revisione drift: 2026-04-21 - chiusi 9 drift identificati
 * nell'audit tra middleware e handler hardcoded.
 */
export const API_ROLE_RULES: readonly ApiRule[] = [
  { prefix: "/api/admin", roles: ["super_admin"] },
  { prefix: "/api/billing", roles: ["owner", "super_admin"] },
  { prefix: "/api/reports", roles: ["owner", "super_admin", "supervisor", "cassa", "hotel_manager", "reception"] },
  { prefix: "/api/hotel/front-desk", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/housekeeping", roles: ["housekeeping", "hotel_manager", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/keycards", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/rate-plans", roles: ["hotel_manager", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/rooms", roles: ["reception", "hotel_manager", "housekeeping", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/reservations", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/availability", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/integration", roles: ["reception", "hotel_manager", "cassa", "sala", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/proposals/schedule", roles: ["super_admin"] },
  { prefix: "/api/ai/proposals", roles: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/kitchen", roles: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai", roles: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/orders", roles: ["sala", "cucina", "bar", "pizzeria", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/kitchen", roles: ["cucina", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/menu", roles: ["cucina", "sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/warehouse", roles: ["magazzino", "cucina", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff/shifts/clock", roles: ["staff", "sala", "cucina", "cassa", "bar", "pizzeria", "magazzino", "reception", "hotel_manager", "housekeeping", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff/shifts", roles: ["staff", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff", roles: ["staff", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/customers", roles: ["reception", "hotel_manager", "sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/bookings", roles: ["sala", "cassa", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/rooms", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/tables", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/suppliers", roles: ["magazzino", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/purchase-orders", roles: ["magazzino", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/catering", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/asporto", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/archivio", roles: ["supervisor", "owner", "super_admin", "cassa"] },
  { prefix: "/api/haccp", roles: ["cucina", "pizzeria", "bar", "magazzino", "supervisor", "owner", "super_admin"] },
  // Tutti gli utenti autenticati possono gestire le proprie sessioni.
  { prefix: "/api/sessions", roles: ["sala", "cucina", "cassa", "supervisor", "magazzino", "staff", "bar", "pizzeria", "hotel_manager", "reception", "housekeeping", "owner", "super_admin"] },
] as const;

export function canAccessWithRole(role: string, required: readonly UserRole[]) {
  if (role === "super_admin") return true;
  // Owner e una vista trasversale sul proprio tenant: se una route NON e'
  // esplicitamente super_admin-only (es. ADMIN_ROLES = ["super_admin"]),
  // l'owner puo' sempre accedere. Evita che dimenticanze in una costante
  // locale su una singola route blocchino il proprietario del tenant.
  if (role === "owner" && !(required.length === 1 && required[0] === "super_admin")) {
    return true;
  }
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
