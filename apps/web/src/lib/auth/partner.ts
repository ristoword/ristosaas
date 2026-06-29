import type { UserRole } from "@/lib/auth/types";

export const PARTNER_ROLE = "partner" as const satisfies UserRole;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** POST consentiti al Partner (AI, export stream, audit). */
const PARTNER_MUTATION_SUFFIXES = ["/ai/chat", "/ai/analyze", "/ai/report", "/export"] as const;

export function isPartnerRole(role: string | undefined | null): role is typeof PARTNER_ROLE {
  return role === PARTNER_ROLE;
}

export function isPartnerReadOnlyRequest(method: string, pathname: string): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  if (pathname.startsWith("/api/partner/audit") || pathname.startsWith("/api/partner/ai/")) return true;
  if (pathname.startsWith("/api/ai/")) return true;
  if (pathname.includes("/ai/")) return true;
  if (pathname.endsWith("/export") && method === "POST") return true;
  if (PARTNER_MUTATION_SUFFIXES.some((s) => pathname.endsWith(s))) return true;
  return false;
}

export function partnerMutationBlocked(role: string, method: string, pathname: string): boolean {
  if (!isPartnerRole(role)) return false;
  return !isPartnerReadOnlyRequest(method, pathname);
}

export function assertPartnerCanMutate(role: string, method: string, pathname: string): boolean {
  if (!isPartnerRole(role)) return true;
  return isPartnerReadOnlyRequest(method, pathname);
}
