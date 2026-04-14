import { NextRequest } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { stripePostForm } from "@/lib/billing/stripe-client";

const BILLING_ROLES = ["owner", "super_admin"] as const;

type ProductPlan = "restaurant_only" | "hotel_only" | "all_included";
type BillingCycle = "monthly" | "annual";

function resolvePriceId(plan: ProductPlan, billingCycle: BillingCycle) {
  const map: Record<ProductPlan, Record<BillingCycle, string | undefined>> = {
    restaurant_only: {
      monthly: process.env.STRIPE_PRICE_RESTAURANT_MONTHLY,
      annual: process.env.STRIPE_PRICE_RESTAURANT_ANNUAL,
    },
    hotel_only: {
      monthly: process.env.STRIPE_PRICE_HOTEL_MONTHLY,
      annual: process.env.STRIPE_PRICE_HOTEL_ANNUAL,
    },
    all_included: {
      monthly: process.env.STRIPE_PRICE_ALL_INCLUDED_MONTHLY,
      annual: process.env.STRIPE_PRICE_ALL_INCLUDED_ANNUAL,
    },
  };
  return map[plan][billingCycle] || null;
}

function validPlan(value: unknown): value is ProductPlan {
  return value === "restaurant_only" || value === "hotel_only" || value === "all_included";
}

function validCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, BILLING_ROLES);
  if (guard.error) return guard.error;

  const payload = await body<{ plan?: ProductPlan; billingCycle?: BillingCycle }>(req);
  const plan = payload.plan;
  const billingCycle = payload.billingCycle;
  if (!validPlan(plan) || !validCycle(billingCycle)) {
    return err("plan and billingCycle are required", 400);
  }

  const priceId = resolvePriceId(plan, billingCycle);
  if (!priceId) return err(`Stripe price not configured for ${plan}/${billingCycle}`, 400);

  const tenantId = getTenantId();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const successUrl = process.env.STRIPE_CHECKOUT_SUCCESS_URL || `${appUrl}/stripe?checkout=success`;
  const cancelUrl = process.env.STRIPE_CHECKOUT_CANCEL_URL || `${appUrl}/stripe?checkout=cancel`;

  const existingSubscription = await prisma.billingSubscription.findFirst({
    where: { tenantId },
    orderBy: { updatedAt: "desc" },
    select: { stripeCustomerId: true },
  });

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("allow_promotion_codes", "true");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", tenantId);
  params.set("subscription_data[metadata][tenantId]", tenantId);
  params.set("subscription_data[metadata][plan]", plan);
  params.set("subscription_data[metadata][billingCycle]", billingCycle);

  if (existingSubscription?.stripeCustomerId) {
    params.set("customer", existingSubscription.stripeCustomerId);
  } else if (guard.user?.email) {
    params.set("customer_email", guard.user.email);
  }

  const created = await stripePostForm<{ id: string; url: string | null }>("/checkout/sessions", params);
  if (!created.ok) return err(created.error, created.status === 500 ? 500 : 502);
  if (!created.data.url) return err("Stripe checkout session missing URL", 502);

  return ok({ id: created.data.id, url: created.data.url });
}
