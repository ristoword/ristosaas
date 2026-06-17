import { NextRequest } from "next/server";
import { ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/owner/portfolio
 *
 * Returns all tenants belonging to the same TenantGroup(s) as the
 * caller's current tenant.  For each tenant, returns a lightweight
 * snapshot (name, plan, status, staff count, recent revenue, orders today).
 *
 * If the caller's tenant is not part of any group, returns an empty
 * array — the owner page simply hides the multi-locale selector.
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, ["owner", "super_admin"]);
  if (guard.error) return guard.error;
  const user = guard.user!;

  const memberships = await prisma.tenantGroupMember.findMany({
    where: { tenantId: user.tenantId },
    select: { groupId: true },
  });

  if (memberships.length === 0) return ok({ groups: [], tenants: [] });

  const groupIds = memberships.map((m) => m.groupId);

  const groups = await prisma.tenantGroup.findMany({
    where: { id: { in: groupIds } },
    include: {
      members: {
        select: { tenantId: true, label: true },
      },
    },
  });

  const allTenantIds = [...new Set(groups.flatMap((g) => g.members.map((m) => m.tenantId)))];

  const tenants = await prisma.tenant.findMany({
    where: { id: { in: allTenantIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      accessStatus: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [staffCounts, orderCounts] = await Promise.all([
    prisma.staffMember.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: allTenantIds }, status: "attivo" },
      _count: true,
    }),
    prisma.restaurantOrder.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: allTenantIds }, createdAt: { gte: today } },
      _count: true,
    }),
  ]);

  const revenueMap = new Map<string, number>();
  const todayServedOrders = await prisma.restaurantOrder.findMany({
    where: {
      tenantId: { in: allTenantIds },
      status: { in: ["servito", "chiuso"] },
      createdAt: { gte: today },
    },
    select: {
      tenantId: true,
      items: { select: { price: true, qty: true } },
    },
  });
  for (const order of todayServedOrders) {
    let orderTotal = 0;
    for (const item of order.items) {
      orderTotal += (item.price ? Number(item.price) : 0) * item.qty;
    }
    revenueMap.set(order.tenantId, (revenueMap.get(order.tenantId) ?? 0) + orderTotal);
  }

  const staffMap = new Map(staffCounts.map((s) => [s.tenantId, s._count]));
  const ordersMap = new Map(orderCounts.map((o) => [o.tenantId, o._count]));

  const enrichedTenants = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    accessStatus: t.accessStatus,
    activeStaff: staffMap.get(t.id) ?? 0,
    ordersToday: ordersMap.get(t.id) ?? 0,
    revenueToday: revenueMap.get(t.id) ?? 0,
    isCurrent: t.id === user.tenantId,
  }));

  const groupsResult = groups.map((g) => ({
    id: g.id,
    name: g.name,
    tenantIds: g.members.map((m) => m.tenantId),
  }));

  return ok({ groups: groupsResult, tenants: enrichedTenants });
}
