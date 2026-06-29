import { prisma } from "@/lib/db/prisma";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function yearStart(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

function isHotelPlan(plan: string) {
  return plan.includes("hotel") || plan === "all_included";
}

function isRestaurantPlan(plan: string) {
  return plan.includes("restaurant") || plan.includes("risto") || plan === "all_included";
}

function licenseMonthlyValue(plan: string, billingCycle: string, partnerPrice: number | null): number {
  const base = partnerPrice ?? 0;
  if (billingCycle === "annual" || billingCycle === "yearly") return base / 12;
  return base;
}

export async function getPartnerDashboardMetrics() {
  const now = new Date();
  const today = startOfDay(now);
  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);

  const [
    licenses,
    subscriptions,
    tenants,
    users,
    dealers,
    partners,
    billingEvents,
  ] = await Promise.all([
    prisma.tenantLicense.findMany({
      include: {
        partner: {
          select: {
            licensePrice: true,
            allInclusivePrice: true,
            commissionType: true,
            commissionEuros: true,
            commissionPct: true,
          },
        },
        tenant: { select: { plan: true, name: true } },
      },
    }),
    prisma.billingSubscription.findMany({
      select: { status: true, cancelAtPeriodEnd: true, currentPeriodStart: true, createdAt: true },
    }),
    prisma.tenant.findMany({ select: { id: true, plan: true, accessStatus: true, createdAt: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "reseller" } }),
    prisma.partner.count({ where: { active: true } }),
    prisma.billingEvent.findMany({
      where: { createdAt: { gte: yearStart(now) }, status: "processed" },
      select: { type: true, payload: true, createdAt: true },
    }),
  ]);

  const byStatus = (s: string) => licenses.filter((l) => l.status === s).length;

  const newLicensesToday = licenses.filter((l) => l.activatedAt >= today).length;
  const newLicensesWeek = licenses.filter((l) => l.activatedAt >= weekAgo).length;
  const newLicensesMonth = licenses.filter((l) => l.activatedAt >= monthAgo).length;

  const activeSubs = subscriptions.filter((s) => ["active", "trialing"].includes(s.status)).length;
  const cancelledSubs = subscriptions.filter((s) => ["canceled", "cancelled", "unpaid"].includes(s.status)).length;
  const trialConverted = licenses.filter((l) => l.status === "active" && l.activatedAt > l.createdAt).length;

  let mrr = 0;
  for (const l of licenses.filter((x) => x.status === "active" || x.status === "trial")) {
    const price =
      l.plan === "all_included"
        ? (l.partner?.allInclusivePrice ?? l.partner?.licensePrice ?? 0)
        : (l.partner?.licensePrice ?? 0);
    mrr += licenseMonthlyValue(l.plan, l.billingCycle, price);
  }

  const arr = mrr * 12;

  const revenueFromEvents = (since: Date) => {
    let total = 0;
    for (const ev of billingEvents) {
      if (ev.createdAt < since) continue;
      const payload = ev.payload as { data?: { object?: { amount_paid?: number; amount?: number } } };
      const cents = payload?.data?.object?.amount_paid ?? payload?.data?.object?.amount ?? 0;
      if (typeof cents === "number" && cents > 0) total += cents / 100;
    }
    return total;
  };

  const hotelTenants = tenants.filter((t) => isHotelPlan(t.plan)).length;
  const restaurantTenants = tenants.filter((t) => isRestaurantPlan(t.plan)).length;

  const trialsExpiringWeek = licenses.filter(
    (l) => l.status === "trial" && l.expiresAt >= now && l.expiresAt <= new Date(now.getTime() + 7 * 86400000),
  ).length;

  return {
    licenses: {
      total: licenses.length,
      trial: byStatus("trial"),
      active: byStatus("active"),
      suspended: byStatus("suspended"),
      expired: byStatus("expired"),
      newToday: newLicensesToday,
      newWeek: newLicensesWeek,
      newMonth: newLicensesMonth,
      trialsExpiringWeek,
    },
    subscriptions: {
      active: activeSubs,
      cancelled: cancelledSubs,
      trialConverted,
    },
    revenue: {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      daily: Math.round(revenueFromEvents(today) * 100) / 100,
      monthly: Math.round(revenueFromEvents(monthStart(now)) * 100) / 100,
      yearly: Math.round(revenueFromEvents(yearStart(now)) * 100) / 100,
      forecast: Math.round(mrr * 1.08 * 100) / 100,
    },
    platform: {
      tenants: tenants.length,
      hotels: hotelTenants,
      restaurants: restaurantTenants,
      users,
      dealers,
      partners,
    },
    generatedAt: now.toISOString(),
  };
}

export async function getPartnerSalesOverview() {
  const [licenses, partners, resellers] = await Promise.all([
    prisma.tenantLicense.findMany({
      include: {
        tenant: { select: { id: true, name: true, plan: true, accessStatus: true } },
        partner: true,
      },
      orderBy: { activatedAt: "desc" },
    }),
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "reseller" },
      select: { id: true, name: true, email: true, partnerCode: true, createdAt: true },
    }),
  ]);

  const rows = licenses.map((l) => {
    const isAllInclusive = l.plan === "all_included";
    const price = isAllInclusive
      ? (l.partner?.allInclusivePrice ?? l.partner?.licensePrice ?? null)
      : (l.partner?.licensePrice ?? null);
    const isPercent = l.partner?.commissionType === "percent";
    let commission: number | null = null;
    if (l.partner && price != null) {
      if (isPercent) {
        const pct = isAllInclusive ? (l.partner.allInclusivePct ?? l.partner.commissionPct) : l.partner.commissionPct;
        commission = Math.round((price * pct / 100) * 100) / 100;
      } else {
        commission = isAllInclusive
          ? (l.partner.allInclusiveCommission ?? l.partner.commissionEuros)
          : l.partner.commissionEuros;
      }
    }
    return {
      tenantId: l.tenantId,
      tenantName: l.tenant.name,
      plan: l.plan,
      billingCycle: l.billingCycle,
      status: l.status,
      activatedAt: l.activatedAt.toISOString(),
      expiresAt: l.expiresAt.toISOString(),
      partnerCode: l.partnerCode,
      partnerName: l.partner?.name ?? null,
      licensePrice: price,
      commissionEuros: commission,
      accessStatus: l.tenant.accessStatus,
    };
  });

  return { licenses: rows, partners, dealers: resellers };
}

export async function getPartnerTenantsOverview() {
  const tenants = await prisma.tenant.findMany({
    include: {
      license: true,
      users: { select: { id: true, role: true } },
      billingSubscriptions: {
        select: { status: true, currentPeriodEnd: true, stripeSubscriptionId: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  return tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    accessStatus: t.accessStatus,
    license: t.license
      ? {
          status: t.license.status,
          plan: t.license.plan,
          billingCycle: t.license.billingCycle,
          seats: t.license.seats,
          usedSeats: t.license.usedSeats,
          expiresAt: t.license.expiresAt.toISOString(),
          partnerCode: t.license.partnerCode,
        }
      : null,
    usersCount: t._count.users,
    subscription: t.billingSubscriptions[0] ?? null,
    storageBytes: null,
  }));
}

export async function getPartnerStripeOverview() {
  const [subscriptions, events] = await Promise.all([
    prisma.billingSubscription.findMany({
      include: { tenant: { select: { name: true, id: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.billingEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        tenantId: true,
        payload: true,
      },
    }),
  ]);

  const invoices = events
    .filter((e) => e.type.includes("invoice"))
    .map((e) => {
      const obj = (e.payload as { data?: { object?: Record<string, unknown> } })?.data?.object ?? {};
      return {
        id: e.id,
        tenantId: e.tenantId,
        type: e.type,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
        amount: typeof obj.amount_paid === "number" ? obj.amount_paid / 100 : null,
        customerEmail: typeof obj.customer_email === "string" ? obj.customer_email : null,
        subscriptionId: typeof obj.subscription === "string" ? obj.subscription : null,
        periodEnd: obj.period_end ? new Date(Number(obj.period_end) * 1000).toISOString() : null,
      };
    });

  return {
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      tenantName: s.tenant.name,
      status: s.status,
      stripeCustomerId: s.stripeCustomerId,
      stripeSubscriptionId: s.stripeSubscriptionId,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      currentPeriodStart: s.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    })),
    invoices,
  };
}
