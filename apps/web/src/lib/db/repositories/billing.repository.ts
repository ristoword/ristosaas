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

type ReadinessCheck = {
  key: string;
  ok: boolean;
  message: string;
};

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

function envVar(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
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
  async reconcileTenantFromLatestSubscription(tenantId: string) {
    const subscription = await prisma.billingSubscription.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    });
    if (!subscription) {
      return { reconciled: false as const, reason: "subscription_not_found" as const };
    }

    const entitlement = resolveEntitlement(
      { metadata: {} },
      subscription.priceId,
    );
    if (!entitlement) {
      return { reconciled: false as const, reason: "entitlement_not_resolved" as const };
    }

    const currentPeriodEnd = subscription.currentPeriodEnd ?? null;
    await applyTenantEntitlements({
      tenantId,
      plan: entitlement.plan,
      seats: entitlement.seats,
      billingCycle: entitlement.billingCycle,
      licenseStatus: toLicenseStatusFromSubscription(subscription.status),
      expiresAt: currentPeriodEnd,
    });
    return { reconciled: true as const, plan: entitlement.plan, seats: entitlement.seats };
  },
  async readiness(tenantId: string) {
    const [
      tenant,
      subscription,
      recentBillingFailures,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          features: true,
          license: true,
        },
      }),
      prisma.billingSubscription.findFirst({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.billingEvent.count({
        where: {
          tenantId,
          type: "invoice.payment_failed",
          createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
        },
      }),
    ]);

    const envChecks: ReadinessCheck[] = [
      { key: "stripe_secret", ok: envVar("STRIPE_SECRET_KEY"), message: "STRIPE_SECRET_KEY configurata" },
      { key: "stripe_webhook", ok: envVar("STRIPE_WEBHOOK_SECRET"), message: "STRIPE_WEBHOOK_SECRET configurata" },
      { key: "checkout_urls", ok: envVar("STRIPE_CHECKOUT_SUCCESS_URL") && envVar("STRIPE_CHECKOUT_CANCEL_URL"), message: "URL checkout success/cancel configurati" },
      { key: "portal_url", ok: envVar("STRIPE_PORTAL_RETURN_URL"), message: "URL customer portal configurato" },
      {
        key: "price_catalog",
        ok:
          envVar("STRIPE_PRICE_RESTAURANT_MONTHLY") ||
          envVar("STRIPE_PRICE_RESTAURANT_ANNUAL") ||
          envVar("STRIPE_PRICE_HOTEL_MONTHLY") ||
          envVar("STRIPE_PRICE_HOTEL_ANNUAL") ||
          envVar("STRIPE_PRICE_ALL_INCLUDED_MONTHLY") ||
          envVar("STRIPE_PRICE_ALL_INCLUDED_ANNUAL"),
        message: "Almeno un prezzo Stripe collegato",
      },
    ];

    const license = tenant?.license;
    const enabledFeatures = new Set((tenant?.features ?? []).filter((f) => f.enabled).map((f) => f.code as TenantFeatureCode));
    const requiredForPlan = tenant ? PLAN_FEATURES[tenant.plan as ProductPlan] ?? [] : [];
    const missingFeatureForPlan = requiredForPlan.filter((feature) => !enabledFeatures.has(feature));

    const tenantChecks: ReadinessCheck[] = [
      { key: "tenant_exists", ok: !!tenant, message: "Tenant presente su DB" },
      { key: "license_exists", ok: !!license, message: "Licenza tenant presente" },
      {
        key: "license_status",
        ok: !!license && (license.status === "active" || license.status === "trial"),
        message: "Licenza in stato active/trial",
      },
      {
        key: "license_seats",
        ok: !!license && license.usedSeats <= license.seats,
        message: "Seats disponibili (usedSeats <= seats)",
      },
      {
        key: "plan_features",
        ok: missingFeatureForPlan.length === 0,
        message: "Feature allineate al piano",
      },
      {
        key: "subscription_linked",
        ok: !!subscription,
        message: "Subscription Stripe collegata al tenant",
      },
      {
        key: "customer_linked",
        ok: !!subscription?.stripeCustomerId,
        message: "Customer Stripe collegato",
      },
    ];

    const integrationReady = envChecks.every((check) => check.ok);
    const tenantReady = tenantChecks.every((check) => check.ok);
    const overallReady = integrationReady && tenantReady;

    const nextActions: string[] = [];
    if (!integrationReady) nextActions.push("Completa variabili STRIPE_* mancanti");
    if (!tenantChecks.find((c) => c.key === "subscription_linked")?.ok) nextActions.push("Esegui primo checkout da pagina Stripe");
    if (!tenantChecks.find((c) => c.key === "plan_features")?.ok) nextActions.push("Esegui reconcile entitlements dal pannello Stripe");
    if ((recentBillingFailures ?? 0) > 0) nextActions.push("Verifica pagamenti falliti ultimi 30 giorni");

    return {
      overallReady,
      integrationReady,
      tenantReady,
      envChecks,
      tenantChecks,
      tenantSummary: tenant
        ? {
            id: tenant.id,
            plan: tenant.plan,
            enabledFeatures: [...enabledFeatures],
            licenseStatus: license?.status ?? null,
            seats: license?.seats ?? null,
            usedSeats: license?.usedSeats ?? null,
          }
        : null,
      subscription: subscription
        ? {
            status: subscription.status,
            priceId: subscription.priceId,
            stripeCustomerId: subscription.stripeCustomerId,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
      recentBillingFailures,
      nextActions,
    };
  },
};
