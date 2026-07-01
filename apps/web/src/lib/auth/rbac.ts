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
  "/api/public/room",
  "/api/public/room-service",
  "/api/public/qr-test",
  "/api/auth/session-valid",
  "/api/auth/license-valid",
  "/api/auth/entitlements-valid",
  "/api/ai/proposals/schedule/daily",
  "/api/ai/automation/schedule/run",
  "/api/jobs/billing/reconcile-all",
  "/api/health/live",
  "/api/health/gates",
  "/api/orders/public-append",
  "/api/orders/public-bill",
] as const;

/**
 * Exact paths that bypass JWT (not prefix — only the exact path).
 * /api/health is the readiness probe and must stay public,
 * but /api/health/ai exposes config and must require auth.
 */
export const PUBLIC_API_EXACT = ["/api/health"] as const;

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
  { prefix: "/api/admin/ai-control", roles: ["super_admin", "partner"] },
  { prefix: "/api/admin", roles: ["super_admin"] },
  { prefix: "/api/billing", roles: ["owner", "super_admin"] },
  { prefix: "/api/reports", roles: ["owner", "super_admin", "supervisor", "cassa", "hotel_manager", "reception"] },
  { prefix: "/api/hotel/guest-register", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/folio", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin", "cassa"] },
  { prefix: "/api/hotel/front-desk", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/housekeeping", roles: ["housekeeping", "hotel_manager", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/keycards", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/rate-plans", roles: ["hotel_manager", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/rooms", roles: ["reception", "hotel_manager", "housekeeping", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/reservations", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/availability", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/integration", roles: ["reception", "hotel_manager", "cassa", "sala", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/knowledge", roles: ["owner", "supervisor", "super_admin", "hotel_manager", "reception", "housekeeping", "cucina", "sala", "bar", "pizzeria", "magazzino", "cassa"] },
  { prefix: "/api/ai/command-center", roles: ["owner", "supervisor", "super_admin"] },
  { prefix: "/api/ai/automation", roles: ["owner", "supervisor", "super_admin", "magazzino", "cucina", "hotel_manager", "reception", "housekeeping"] },
  { prefix: "/api/ai/automation/schedule", roles: ["super_admin"] },
  { prefix: "/api/ai/memory", roles: ["cucina", "magazzino", "hotel_manager", "reception", "supervisor", "owner", "super_admin", "sala", "bar", "pizzeria", "cassa", "staff"] },
  { prefix: "/api/ai/proposals/schedule", roles: ["super_admin"] },
  { prefix: "/api/ai/voice", roles: ["owner", "supervisor", "cucina", "magazzino", "sala", "bar", "pizzeria", "cassa", "hotel_manager", "reception", "housekeeping", "super_admin"] },
  { prefix: "/api/ai/vision", roles: ["owner", "supervisor", "cucina", "magazzino", "sala", "bar", "pizzeria", "cassa", "hotel_manager", "reception", "housekeeping", "super_admin"] },
  { prefix: "/api/ai/orchestrator", roles: ["sala", "cucina", "bar", "pizzeria", "cassa", "magazzino", "staff", "supervisor", "owner", "super_admin", "hotel_manager", "reception", "housekeeping"] },
  { prefix: "/api/ai/decisions", roles: ["owner", "supervisor", "cucina", "magazzino", "hotel_manager", "reception", "sala", "cassa", "super_admin"] },
  { prefix: "/api/ai/proposals", roles: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/super-admin", roles: ["super_admin"] },
  { prefix: "/api/ai/licenses", roles: ["owner", "super_admin"] },
  { prefix: "/api/ai/hardware", roles: ["owner", "super_admin"] },
  { prefix: "/api/ai/owner", roles: ["owner", "super_admin"] },
  { prefix: "/api/ai/supervisor", roles: ["supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/sala", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/cassa", roles: ["cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/pizzeria", roles: ["pizzeria", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/bar", roles: ["bar", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/foodcost", roles: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/inventory", roles: ["magazzino", "cucina", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/crm", roles: ["reception", "hotel_manager", "sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/haccp", roles: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/hotel", roles: ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/reception", roles: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/housekeeping", roles: ["housekeeping", "hotel_manager", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/prenotazioni", roles: ["sala", "cassa", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/room-service", roles: ["staff", "reception", "housekeeping", "hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/catering", roles: ["sala", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/staff", roles: ["staff", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/turni", roles: ["staff", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/dashboard", roles: ["sala", "cucina", "bar", "pizzeria", "cassa", "magazzino", "staff", "supervisor", "owner", "super_admin", "hotel_manager", "reception", "housekeeping"] },
  { prefix: "/api/ai/qr", roles: ["sala", "cassa", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/cucina", roles: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/kitchen", roles: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/magazzino", roles: ["magazzino", "cucina", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/ai/cantina", roles: ["owner", "supervisor", "sala", "bar", "super_admin"] },
  { prefix: "/api/ai", roles: ["cucina", "magazzino", "hotel_manager", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/orders", roles: ["sala", "cucina", "bar", "pizzeria", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/kitchen", roles: ["cucina", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/menu", roles: ["cucina", "sala", "cassa", "supervisor", "owner", "super_admin"] },
  {
    prefix: "/api/warehouse/bolla-import",
    roles: ["magazzino", "cucina", "supervisor", "owner", "super_admin", "bar", "sala", "cassa"],
  },
  { prefix: "/api/warehouse", roles: ["magazzino", "cucina", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff/obiettivi", roles: ["supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff/tokens", roles: ["sala", "cucina", "bar", "pizzeria", "cassa", "magazzino", "supervisor", "owner", "super_admin", "hotel_manager", "reception"] },
  { prefix: "/api/staff/shifts/clock", roles: ["staff", "sala", "cucina", "cassa", "bar", "pizzeria", "magazzino", "reception", "hotel_manager", "housekeeping", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff/shifts", roles: ["staff", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/staff", roles: ["staff", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/candidati", roles: ["supervisor", "owner", "super_admin"] },
  { prefix: "/api/community", roles: ["owner", "supervisor", "super_admin", "cucina", "sala", "cassa", "bar", "pizzeria", "magazzino", "staff", "hotel_manager", "reception", "housekeeping"] },
  { prefix: "/api/customers", roles: ["reception", "hotel_manager", "sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/bookings", roles: ["sala", "cassa", "reception", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/rooms", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/tables", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/suppliers", roles: ["magazzino", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/purchase-orders", roles: ["magazzino", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/catering", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/asporto", roles: ["sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/supervisor", roles: ["supervisor", "owner", "super_admin"] },
  { prefix: "/api/archivio/ordini-fornitore", roles: ["supervisor", "owner", "super_admin", "cassa", "magazzino"] },
  { prefix: "/api/archivio", roles: ["supervisor", "owner", "super_admin", "cassa"] },
  { prefix: "/api/haccp", roles: ["cucina", "pizzeria", "bar", "magazzino", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/operational-notes", roles: ["cucina", "pizzeria", "bar", "sala", "cassa", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/shift-plans/sync", roles: ["supervisor", "owner", "super_admin"] },
  { prefix: "/api/shift-plans", roles: ["cucina", "pizzeria", "bar", "sala", "supervisor", "owner", "super_admin"] },
  // Log email invii tenant.
  { prefix: "/api/email-logs", roles: ["owner", "super_admin"] },
  // Lista utenti tenant (per collegamento staff ↔ user).
  { prefix: "/api/users", roles: ["supervisor", "owner", "super_admin"] },
  // Ricerca globale: tutti gli utenti autenticati.
  { prefix: "/api/search", roles: ["sala", "cucina", "bar", "pizzeria", "cassa", "magazzino", "staff", "supervisor", "owner", "super_admin", "hotel_manager", "reception", "housekeeping"] },
  // Hotel rooms tokens: generazione QR firmati per le camere.
  { prefix: "/api/hotel/rooms/tokens", roles: ["hotel_manager", "reception", "supervisor", "owner", "super_admin"] },
  // Room Service hotel: addebito e catalogo solo a hotel_manager+; lettura/creazione a tutto lo staff hotel.
  { prefix: "/api/hotel/room-service/catalog", roles: ["hotel_manager", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/room-service", roles: ["staff", "reception", "housekeeping", "hotel_manager", "supervisor", "owner", "super_admin"] },
  // Notifiche: tutti gli utenti autenticati possono leggere e marcare le proprie notifiche.
  { prefix: "/api/notifications", roles: ["sala", "cucina", "bar", "pizzeria", "cassa", "magazzino", "staff", "supervisor", "owner", "super_admin", "hotel_manager", "reception", "housekeeping"] },
  // Chat staff: tutti gli utenti autenticati del tenant.
  { prefix: "/api/chat/messages", roles: ["sala", "cucina", "bar", "pizzeria", "cassa", "magazzino", "staff", "supervisor", "owner", "super_admin", "hotel_manager", "reception", "housekeeping"] },
  // Tutti gli utenti autenticati possono gestire le proprie sessioni.
  { prefix: "/api/sessions", roles: ["sala", "cucina", "cassa", "supervisor", "magazzino", "staff", "bar", "pizzeria", "hotel_manager", "reception", "housekeeping", "owner", "super_admin"] },
  // Hardware: configurazione stampanti/display, riservata a owner e super_admin.
  { prefix: "/api/hardware", roles: ["owner", "super_admin"] },
  { prefix: "/api/integrations", roles: ["owner", "super_admin"] },
  { prefix: "/api/cassa", roles: ["cassa", "sala", "supervisor", "owner", "super_admin"] },
  { prefix: "/api/hotel/stays", roles: ["hotel_manager", "reception", "owner", "super_admin", "housekeeping"] },
  { prefix: "/api/archivio/fiscal-invoices", roles: ["supervisor", "owner", "super_admin", "cassa"] },
  { prefix: "/api/health/ai", roles: ["owner", "super_admin"] },
  { prefix: "/api/owner/portfolio", roles: ["owner", "super_admin"] },
  { prefix: "/api/reseller", roles: ["reseller", "super_admin"] },
  { prefix: "/api/partner", roles: ["partner", "super_admin"] },
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
  // Partner enterprise: accesso operativo come owner, esclusi endpoint super_admin-only.
  if (role === "partner" && !(required.length === 1 && required[0] === "super_admin")) {
    return true;
  }
  return required.includes(role as UserRole);
}

export function isPublicApiPath(pathname: string) {
  return (
    PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_API_EXACT.some((exact) => pathname === exact)
  );
}

export function getApiRequiredRoles(pathname: string) {
  const match = API_ROLE_RULES
    .filter((rule) => pathname.startsWith(rule.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match?.roles ?? null;
}
