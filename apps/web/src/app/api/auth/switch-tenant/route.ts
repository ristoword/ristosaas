import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, setAuthCookies } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/auth/switch-tenant?tenantId=xxx
 *
 * Allows an owner to switch their active tenant within a TenantGroup.
 * Validates that the user's current tenant and the target tenant belong
 * to the same group, then re-issues JWT cookies scoped to the new tenant
 * and redirects to /owner.
 *
 * Does NOT modify the user's DB record — the switch is purely session-based.
 */
export async function GET(req: NextRequest) {
  const user = getRequestUser(req);
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (user.role !== "owner" && user.role !== "super_admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const targetTenantId = req.nextUrl.searchParams.get("tenantId");
  if (!targetTenantId) {
    return NextResponse.redirect(new URL("/owner", req.url));
  }

  if (targetTenantId === user.tenantId) {
    return NextResponse.redirect(new URL("/owner", req.url));
  }

  const currentGroups = await prisma.tenantGroupMember.findMany({
    where: { tenantId: user.tenantId },
    select: { groupId: true },
  });

  if (currentGroups.length === 0) {
    return NextResponse.redirect(new URL("/owner", req.url));
  }

  const groupIds = currentGroups.map((g) => g.groupId);

  const targetMembership = await prisma.tenantGroupMember.findFirst({
    where: {
      tenantId: targetTenantId,
      groupId: { in: groupIds },
    },
  });

  if (!targetMembership) {
    return NextResponse.redirect(new URL("/owner", req.url));
  }

  const targetTenant = await prisma.tenant.findUnique({
    where: { id: targetTenantId },
    select: { id: true, accessStatus: true },
  });

  if (!targetTenant || targetTenant.accessStatus !== "active") {
    return NextResponse.redirect(new URL("/owner", req.url));
  }

  const res = NextResponse.redirect(new URL("/owner", req.url));

  setAuthCookies(res, {
    userId: user.id,
    tenantId: targetTenantId,
    role: user.role,
    username: user.username,
    name: user.name,
    email: user.email,
    sessionVersion: user.sessionVersion,
  });

  return res;
}
