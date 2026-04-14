import { prisma } from "@/lib/db/prisma";

type StripeLikeEvent = {
  id: string;
  type: string;
  data?: { object?: any };
};

type ProductPlan = "restaurant_only" | "hotel_only" | "all_included";
type TenantFeatureCode =
  | "restaurant"
  | "hotel"
  | "integration_room_charge"
  | "integration_unified_folio"
  | "integration_meal_plans";

type BillingCycle = "monthly" | "annual" | "unknown";

type EntitlementPayload = {
  plan: ProductPlan;
  seats: number;
  billingCycle: BillingCycle;
};

const PLAN_FEATURES: Record<ProductPlan, TenantFeatureCode[]> = {
  restaurant_only: ["restaurant"],
  hotel_only: ["hotel"],
  all_included: ["restaurant", "hotel", "integration_room_charge", "integration_unified_folio", "integration_meal_plans"],
};

const ALL_FEATURES: TenantFeatureCode[] = [
  "restaurant",
  "hotel",
  "integration_room_charge",
  "integration_unified_folio",
  "integration_meal_plans",
];

function toLicenseStatusFromSubscription(status: string): "trial" | "active" | "expired" | "suspended" {
  if (status === "trialing" || status === "active") return "active";
  if (status === "past_due" || status === "unpaid") return "suspended";
  if (status === "canceled" || status === "incomplete_expired") return "expired";
  return "trial";
}

function inferTenantId(event: StripeLikeEvent) {
  const object = event.data?.object ?? {};
  const metadata = object.metadata ?? {};
  if (typeof metadata.tenantId === "string" && metadata.tenantId.length > 0) {
    return metadata.tenantId;
  }
  return null;
}

function parseSeats(value: unknown, fallback = 25) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parsePlan(value: unknown): ProductPlan | null {
  if (value === "restaurant_only" || value === "hotel_only" || value === "all_included") return value;
  return null;
}

function inferBillingCycleFromPriceId(priceId: string | null): BillingCycle {
  if (!priceId) return "unknown";
  if (priceId.includes("annual") || priceId.includes("year")) return "annual";
  if (priceId.includes("monthly") || priceId.includes("month")) return "monthly";
  return "unknown";
}

function resolveEntitlementFromPriceId(priceId: string | null): EntitlementPayload | null {
  if (!priceId) return null;
  const catalogue: Record<string, EntitlementPayload> = {};

  const restaurantMonthly = process.env.STRIPE_PRICE_RESTAURANT_MONTHLY;
  const restaurantAnnual = process.env.STRIPE_PRICE_RESTAURANT_ANNUAL;
  const hotelMonthly = process.env.STRIPE_PRICE_HOTEL_MONTHLY;
  const hotelAnnual = process.env.STRIPE_PRICE_HOTEL_ANNUAL;
  const allIncludedMonthly = process.env.STRIPE_PRICE_ALL_INCLUDED_MONTHLY;
  const allIncludedAnnual = process.env.STRIPE_PRICE_ALL_INCLUDED_ANNUAL;

  if (restaurantMonthly) {
    catalogue[restaurantMonthly] = {
      plan: "restaurant_only",
      seats: parseSeats(process.env.STRIPE_SEATS_RESTAURANT, 15),
      billingCycle: "monthly",
    };
  }
  if (restaurantAnnual) {
    catalogue[restaurantAnnual] = {
      plan: "restaurant_only",
      seats: parseSeats(process.env.STRIPE_SEATS_RESTAURANT, 15),
      billingCycle: "annual",
    };
  }
  if (hotelMonthly) {
    catalogue[hotelMonthly] = {
      plan: "hotel_only",
      seats: parseSeats(process.env.STRIPE_SEATS_HOTEL, 15),
      billingCycle: "monthly",
    };
  }
  if (hotelAnnual) {
    catalogue[hotelAnnual] = {
      plan: "hotel_only",
      seats: parseSeats(process.env.STRIPE_SEATS_HOTEL, 15),
      billingCycle: "annual",
    };
  }
  if (allIncludedMonthly) {
    catalogue[allIncludedMonthly] = {
      plan: "all_included",
      seats: parseSeats(process.env.STRIPE_SEATS_ALL_INCLUDED, 25),
      billingCycle: "monthly",
    };
  }
  if (allIncludedAnnual) {
    catalogue[allIncludedAnnual] = {
      plan: "all_included",
      seats: parseSeats(process.env.STRIPE_SEATS_ALL_INCLUDED, 25),
      billingCycle: "annual",
    };
  }

  return catalogue[priceId] ?? null;
}

function resolveEntitlement(object: any, itemPriceId: string | null): EntitlementPayload | null {
  const metadata = object?.metadata ?? {};
  const metadataPlan = parsePlan(metadata.plan);
  if (metadataPlan) {
    return {
      plan: metadataPlan,
      seats: parseSeats(metadata.seats, metadataPlan === "all_included" ? 25 : 15),
      billingCycle:
        metadata.billingCycle === "monthly" || metadata.billingCycle === "annual"
          ? metadata.billingCycle
          : inferBillingCycleFromPriceId(itemPriceId),
    };
  }
  const fromPrice = resolveEntitlementFromPriceId(itemPriceId);
  if (fromPrice) return fromPrice;
  return null;
}

async function applyTenantEntitlements(params: {
  tenantId: string;
  plan: ProductPlan;
  seats: number;
  billingCycle: BillingCycle;
  licenseStatus: "trial" | "active" | "expired" | "suspended";
  expiresAt?: Date | null;
}) {
  const now = new Date();
  const enabled = new Set(PLAN_FEATURES[params.plan]);

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: params.tenantId },
      data: { plan: params.plan },
    });

    await Promise.all(
      ALL_FEATURES.map((code) =>
        tx.tenantFeature.upsert({
          where: { tenantId_code: { tenantId: params.tenantId, code } },
          update: { enabled: enabled.has(code) },
          create: { tenantId: params.tenantId, code, enabled: enabled.has(code) },
        }),
      ),
    );

    await tx.tenantLicense.upsert({
      where: { tenantId: params.tenantId },
      update: {
        status: params.licenseStatus,
        plan: params.plan,
        billingCycle: params.billingCycle === "unknown" ? "monthly" : params.billingCycle,
        seats: params.seats,
        expiresAt: params.expiresAt ?? undefined,
      },
      create: {
        tenantId: params.tenantId,
        licenseKey: `AUTO-${params.tenantId}-${Date.now().toString(36).toUpperCase()}`,
        status: params.licenseStatus,
        plan: params.plan,
        billingCycle: params.billingCycle === "unknown" ? "monthly" : params.billingCycle,
        seats: params.seats,
        usedSeats: 0,
        activatedAt: now,
        expiresAt: params.expiresAt ?? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  });
}

export const billingRepository = {
  async recordRawEvent(event: StripeLikeEvent, status: "received" | "processed" | "failed", tenantId?: string | null) {
    return prisma.billingEvent.upsert({
      where: { stripeEventId: event.id },
      update: {
        type: event.type,
        status,
        payload: event as any,
        tenantId: tenantId || null,
        processedAt: status === "processed" ? new Date() : undefined,
      },
      create: {
        stripeEventId: event.id,
        type: event.type,
        status,
        payload: event as any,
        tenantId: tenantId || null,
        processedAt: status === "processed" ? new Date() : null,
      },
    });
  },

  async processStripeEvent(event: StripeLikeEvent) {
    let tenantId = inferTenantId(event);
    const object = event.data?.object ?? {};

    if (!tenantId && typeof object.subscription === "string") {
      const existing = await prisma.billingSubscription.findUnique({
        where: { stripeSubscriptionId: object.subscription },
      });
      tenantId = existing?.tenantId ?? null;
    }

    await this.recordRawEvent(event, "received", tenantId);

    if (!tenantId) {
      await this.recordRawEvent(event, "failed", null);
      return { processed: false as const, reason: "tenant_not_resolved" as const };
    }

    if (event.type.startsWith("customer.subscription.")) {
      const subscription = object;
      const stripeSubscriptionId = String(subscription.id || "");
      if (!stripeSubscriptionId) {
        await this.recordRawEvent(event, "failed", tenantId);
        return { processed: false as const, reason: "missing_subscription_id" as const };
      }

      const itemPriceId =
        subscription.items?.data?.[0]?.price?.id && String(subscription.items.data[0].price.id);
      const licenseStatus = toLicenseStatusFromSubscription(String(subscription.status || ""));
      const entitlement = resolveEntitlement(subscription, itemPriceId || null);
      const currentPeriodEnd = subscription.current_period_end
        ? new Date(Number(subscription.current_period_end) * 1000)
        : null;

      await prisma.billingSubscription.upsert({
        where: { stripeSubscriptionId },
        update: {
          tenantId,
          stripeCustomerId: subscription.customer ? String(subscription.customer) : null,
          priceId: itemPriceId || null,
          status: String(subscription.status || "unknown"),
          cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
          currentPeriodStart: subscription.current_period_start
            ? new Date(Number(subscription.current_period_start) * 1000)
            : null,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(Number(subscription.current_period_end) * 1000)
            : null,
        },
        create: {
          tenantId,
          stripeCustomerId: subscription.customer ? String(subscription.customer) : null,
          stripeSubscriptionId,
          priceId: itemPriceId || null,
          status: String(subscription.status || "unknown"),
          cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
          currentPeriodStart: subscription.current_period_start
            ? new Date(Number(subscription.current_period_start) * 1000)
            : null,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(Number(subscription.current_period_end) * 1000)
            : null,
        },
      });

      if (entitlement) {
        await applyTenantEntitlements({
          tenantId,
          plan: entitlement.plan,
          seats: entitlement.seats,
          billingCycle: entitlement.billingCycle,
          licenseStatus,
          expiresAt: currentPeriodEnd,
        });
      } else {
        await prisma.tenantLicense.updateMany({
          where: { tenantId },
          data: {
            status: licenseStatus,
            expiresAt: currentPeriodEnd ?? undefined,
          },
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      await prisma.tenantLicense.updateMany({
        where: { tenantId },
        data: { status: "suspended" },
      });
    }

    if (event.type === "invoice.payment_succeeded") {
      await prisma.tenantLicense.updateMany({
        where: { tenantId },
        data: { status: "active" },
      });
    }

    await this.recordRawEvent(event, "processed", tenantId);
    return { processed: true as const };
  },

  async overview(tenantId: string) {
    const [subscription, events] = await Promise.all([
      prisma.billingSubscription.findFirst({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.billingEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    return { subscription, events };
  },
};
