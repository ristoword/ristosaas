import type { NextRequest } from "next/server";
import { err } from "@/lib/api/helpers";
import { canAccessWithRole } from "@/lib/auth/rbac";
import { getRequestUser } from "@/lib/auth/session";
import type { PublicUser, UserRole } from "@/lib/auth/types";

export function hasRole(userRole: UserRole, requiredRoles: readonly string[]) {
  return canAccessWithRole(userRole, requiredRoles as readonly UserRole[]);
}

export function requireApiUser(req: NextRequest, requiredRoles?: readonly string[]) {
  const user = getRequestUser(req);
  if (!user) return { error: err("Unauthorized", 401), user: null as PublicUser | null };

  if (requiredRoles && requiredRoles.length > 0 && !hasRole(user.role, requiredRoles)) {
    return { error: err("Forbidden", 403), user: null as PublicUser | null };
  }

  return { error: null, user };
}
