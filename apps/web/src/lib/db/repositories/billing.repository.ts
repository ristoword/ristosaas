import { prisma } from "@/lib/db/prisma";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";

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

function isPlaceholderValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes("da_inserire") ||
    normalized.includes("replace-with") ||
    normalized.includes("example") ||
    normalized.includes("placeholder") ||
    normalized.endsWith("_id") ||
    normalized.includes("...")
  );
}

function envValue(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && !isPlaceholderValue(trimmed) ? trimmed : null;
}

function envVar(name: string) {
  return envValue(name) !== null;
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

async function tryProvisionSignupTenant(event: StripeLikeEvent): Promise<{ tenantId: string } | null> {
  if (!event?.type?.startsWith("customer.subscription.")) return null;

  const object = event.data?.object ?? {};
  const metadata = object?.metadata ?? {};
  if (String(metadata?.signup ?? "") !== "1") return null;

  const tenantName = typeof metadata.tenantName === "string" ? metadata.tenantName.trim() : "";
  const slug = typeof metadata.tenantSlug === "string" ? metadata.tenantSlug.trim().toLowerCase() : "";
  const ownerEmail = typeof metadata.ownerEmail === "string" ? metadata.ownerEmail.trim().toLowerCase() : "";
  const ownerName = typeof metadata.ownerName === "string" ? metadata.ownerName.trim() : "";
  const ownerUsername = typeof metadata.ownerUsername === "string" ? metadata.ownerUsername.trim() : "";

  const itemPriceId = object?.items?.data?.[0]?.price?.id ? String(object.items.data[0].price.id) : null;
  const entitlement = resolveEntitlement(object, itemPriceId);
  if (!entitlement || !tenantName || !slug || !ownerEmail || !ownerName || !ownerUsername) {
    return null;
  }

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) return { tenantId: existing.id };

  const tempPassword = `Temp#${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  // Lazy import to avoid a repo→repo circular dependency at module init.
  const { adminRepository } = await import("@/lib/db/repositories/admin.repository");
  const created = await adminRepository.createTenantWithLicense({
    name: tenantName,
    slug,
    plan: entitlement.plan,
    billingCycle: entitlement.billingCycle === "annual" ? "annual" : "monthly",
    seats: entitlement.seats,
    adminUser: {
      username: ownerUsername,
      email: ownerEmail,
      name: ownerName,
      password: tempPassword,
      role: "owner",
    },
  });
  const tenantId = (created as { tenant?: { id: string } })?.tenant?.id ?? (created as { id?: string })?.id;
  if (!tenantId) return null;

  // The owner user was created with a temp password; force password change on
  // first login. We don't re-hash here, just flag the user.
  await prisma.user
    .updateMany({ where: { tenantId, role: "owner" }, data: { mustChangePassword: true } })
    .catch(() => {});

  // Fire-and-forget email with temp credentials. Never block provisioning.
  void sendSignupWelcomeEmail({
    tenantName,
    ownerName,
    ownerEmail,
    ownerUsername,
    tempPassword,
  }).catch(() => {});

  return { tenantId };
}

async function sendSignupWelcomeEmail(params: {
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
  ownerUsername: string;
  tempPassword: string;
}) {
  // Minimal hook. Real SMTP is tenant-scoped in this project, and the tenant
  // has just been created — so we use platform-level ops alert as a fallback
  // channel if an ops webhook is configured. This ensures the credentials
  // never disappear silently even if no email provider is wired yet.
  try {
    const { sendOperationalAlert } = await import("@/lib/observability/alerts");
    await sendOperationalAlert({
      key: `signup_credentials_${params.ownerUsername}`,
      title: `Nuovo signup self-service: ${params.tenantName}`,
      message: [
        `Tenant: ${params.tenantName}`,
        `Owner: ${params.ownerName} <${params.ownerEmail}>`,
        `Username: ${params.ownerUsername}`,
        `Password temporanea: ${params.tempPassword}`,
        `L'utente dovrà cambiare password al primo login.`,
      ].join("\n"),
      severity: "warning",
      metadata: { ownerEmail: params.ownerEmail },
    });
  } catch {
    /* non-fatal */
  }
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
    if (!event?.id || typeof event.id !== "string") {
      return { processed: false as const, reason: "missing_event_id" as const };
    }

    // Idempotency: if we already processed this Stripe event.id, return now and
    // don't re-run side effects (plan upgrade, license changes, etc.).
    const prior = await prisma.billingEvent.findUnique({ where: { stripeEventId: event.id } });
    if (prior?.status === "processed") {
      return { processed: true as const, duplicate: true as const, eventId: event.id };
    }

    let tenantId = inferTenantId(event);
    const object = event.data?.object ?? {};

    if (!tenantId && typeof object.subscription === "string") {
      const existing = await prisma.billingSubscription.findUnique({
        where: { stripeSubscriptionId: object.subscription },
      });
      tenantId = existing?.tenantId ?? null;
    }

    // Self-service signup: if the subscription metadata says `signup=1` and no
    // tenant can yet be resolved, provision tenant + owner + license now. The
    // rest of the webhook handler runs unchanged on the freshly created tenant.
    if (!tenantId) {
      const signupResult = await tryProvisionSignupTenant(event);
      if (signupResult) {
        tenantId = signupResult.tenantId;
      }
    }

    await this.recordRawEvent(event, "received", tenantId);

    // Checkout one-time: ordini menu pubblico (metadata `purpose=restaurant_order`).
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object ?? {};
      const md = session.metadata ?? {};
      if (
        md.purpose === "restaurant_order" &&
        typeof md.restaurantOrderId === "string" &&
        typeof md.tenantId === "string"
      ) {
        const sessionId = String(session.id ?? "");
        if (!sessionId) {
          await this.recordRawEvent(event, "failed", md.tenantId);
          return { processed: false as const, reason: "missing_session_id" as const };
        }
        if (session.payment_status !== "paid") {
          await this.recordRawEvent(event, "failed", md.tenantId);
          return { processed: false as const, reason: "checkout_not_paid" as const };
        }
        const mark = await ordersRepository.markOnlinePaymentPaidFromCheckout({
          tenantId: md.tenantId,
          orderId: md.restaurantOrderId,
          stripeCheckoutSessionId: sessionId,
          amountTotalCents: Number(session.amount_total ?? 0),
          currency: String(session.currency ?? "eur"),
        });
        if (!mark.ok) {
          await this.recordRawEvent(event, "failed", md.tenantId);
          return { processed: false as const, reason: mark.reason as "amount_mismatch" };
        }
        await this.recordRawEvent(event, "processed", md.tenantId);
        return { processed: true as const };
      }
    }

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

    const stripeSecretKey = envValue("STRIPE_SECRET_KEY");
    const checkoutSuccessUrl = envValue("STRIPE_CHECKOUT_SUCCESS_URL");
    const checkoutCancelUrl = envValue("STRIPE_CHECKOUT_CANCEL_URL");
    const portalReturnUrl = envValue("STRIPE_PORTAL_RETURN_URL");
    const runtimeEnvironment = process.env.NODE_ENV === "production" ? "production" : "non_production";
    const stripeMode = stripeSecretKey?.startsWith("sk_live_")
      ? "live"
      : stripeSecretKey?.startsWith("sk_test_")
        ? "test"
        : "unknown";

    const envChecks: ReadinessCheck[] = [
      { key: "stripe_secret", ok: envVar("STRIPE_SECRET_KEY"), message: "STRIPE_SECRET_KEY configurata" },
      { key: "stripe_webhook", ok: envVar("STRIPE_WEBHOOK_SECRET"), message: "STRIPE_WEBHOOK_SECRET configurata" },
      {
        key: "checkout_urls",
        ok: envVar("STRIPE_CHECKOUT_SUCCESS_URL") && envVar("STRIPE_CHECKOUT_CANCEL_URL"),
        message: "URL checkout success/cancel configurati",
      },
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
      {
        key: "live_mode_production",
        ok: runtimeEnvironment !== "production" || stripeMode === "live",
        message: "In produzione usa chiavi Stripe live (sk_live_*)",
      },
      {
        key: "https_urls_production",
        ok:
          runtimeEnvironment !== "production" ||
          !!(
            checkoutSuccessUrl?.startsWith("https://") &&
            checkoutCancelUrl?.startsWith("https://") &&
            portalReturnUrl?.startsWith("https://")
          ),
        message: "In produzione usa solo URL https per checkout/portal",
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
    if (runtimeEnvironment === "production" && stripeMode !== "live") nextActions.push("Sostituisci chiave Stripe test con chiave live in produzione");
    if (
      runtimeEnvironment === "production" &&
      !(
        checkoutSuccessUrl?.startsWith("https://") &&
        checkoutCancelUrl?.startsWith("https://") &&
        portalReturnUrl?.startsWith("https://")
      )
    ) {
      nextActions.push("Configura URL HTTPS validi per checkout success/cancel e customer portal");
    }
    if ((recentBillingFailures ?? 0) > 0) nextActions.push("Verifica pagamenti falliti ultimi 30 giorni");

    return {
      overallReady,
      integrationReady,
      tenantReady,
      runtimeEnvironment,
      stripeMode,
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
