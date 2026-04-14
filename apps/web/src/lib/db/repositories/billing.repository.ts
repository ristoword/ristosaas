import { prisma } from "@/lib/db/prisma";

type StripeLikeEvent = {
  id: string;
  type: string;
  data?: { object?: any };
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

      await prisma.tenantLicense.updateMany({
        where: { tenantId },
        data: {
          status: toLicenseStatusFromSubscription(String(subscription.status || "")),
          expiresAt: subscription.current_period_end
            ? new Date(Number(subscription.current_period_end) * 1000)
            : undefined,
        },
      });
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
