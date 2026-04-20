import { NextRequest, NextResponse } from "next/server";
import { body, err, ok } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";
import { stripePostForm } from "@/lib/billing/stripe-client";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";

type ProductPlan = "restaurant_only" | "hotel_only" | "all_included";
type BillingCycle = "monthly" | "annual";

function validPlan(value: unknown): value is ProductPlan {
  return value === "restaurant_only" || value === "hotel_only" || value === "all_included";
}

function validCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

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

function normalizeSlug(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").slice(0, 60);
}

function normalizeUsername(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "").slice(0, 40);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Self-service signup: creates a Stripe Checkout Session in subscription mode
 * that carries all the metadata needed by the webhook to provision a tenant +
 * owner + license the first time `customer.subscription.created` is processed.
 *
 * This endpoint is PUBLIC (unauthenticated) on purpose but is heavily
 * rate-limited and validated. It never writes to the DB directly: the source
 * of truth for tenant provisioning stays the Stripe webhook.
 */
export async function POST(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  const rl = await applyRateLimit(ip, {
    bucket: "public:signup",
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: `Troppi tentativi di signup. Riprova tra ${Math.ceil(rl.resetInMs / 1000)}s.` },
      { status: 429 },
    );
    for (const [k, v] of Object.entries(rateLimitHeaders(rl))) res.headers.set(k, v);
    return res;
  }

  const payload = await body<{
    tenantName?: string;
    tenantSlug?: string;
    plan?: ProductPlan;
    billingCycle?: BillingCycle;
    owner?: { name?: string; email?: string; username?: string };
  }>(req);

  const tenantName = payload.tenantName?.trim() ?? "";
  if (tenantName.length < 2 || tenantName.length > 120) {
    return err("Nome struttura obbligatorio (2-120 caratteri).", 400);
  }

  const slug = normalizeSlug(payload.tenantSlug ?? tenantName);
  if (slug.length < 3) return err("Slug tenant non valido.", 400);

  if (!validPlan(payload.plan)) return err("Piano non valido.", 400);
  if (!validCycle(payload.billingCycle)) return err("Cadenza non valida.", 400);
  const plan = payload.plan;
  const billingCycle = payload.billingCycle;

  const ownerName = payload.owner?.name?.trim() ?? "";
  const ownerEmail = (payload.owner?.email ?? "").trim().toLowerCase();
  const rawUsername = payload.owner?.username ?? "";
  const ownerUsername = normalizeUsername(rawUsername);

  if (ownerName.length < 2 || ownerName.length > 120) return err("Nome referente obbligatorio.", 400);
  if (!validEmail(ownerEmail)) return err("Email referente non valida.", 400);
  if (ownerUsername.length < 3 || ownerUsername.length > 40) return err("Username referente non valido (3-40 char).", 400);
  if (ownerUsername === "owner") {
    return err("L'username 'owner' è riservato al demo. Scegline un altro.", 400);
  }

  // Pre-flight uniqueness checks. These are best-effort (race-safe is the DB).
  const [slugTaken, emailTaken, usernameTaken] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug } }).catch(() => null),
    prisma.user.findUnique({ where: { email: ownerEmail } }).catch(() => null),
    prisma.user.findUnique({ where: { username: ownerUsername } }).catch(() => null),
  ]);
  if (slugTaken) return err("Slug struttura già in uso.", 409);
  if (emailTaken) return err("Email già registrata. Accedi oppure reimposta la password.", 409);
  if (usernameTaken) return err("Username già in uso.", 409);

  const priceId = resolvePriceId(plan, billingCycle);
  if (!priceId) return err(`Prezzo Stripe non configurato per ${plan}/${billingCycle}.`, 400);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const successUrl = process.env.STRIPE_CHECKOUT_SUCCESS_URL || `${appUrl}/signup?status=success`;
  const cancelUrl = process.env.STRIPE_CHECKOUT_CANCEL_URL || `${appUrl}/signup?status=cancel`;

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("allow_promotion_codes", "true");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("customer_email", ownerEmail);
  params.set("client_reference_id", `signup:${slug}`);
  params.set("subscription_data[metadata][signup]", "1");
  params.set("subscription_data[metadata][plan]", plan);
  params.set("subscription_data[metadata][billingCycle]", billingCycle);
  params.set("subscription_data[metadata][tenantName]", tenantName);
  params.set("subscription_data[metadata][tenantSlug]", slug);
  params.set("subscription_data[metadata][ownerName]", ownerName);
  params.set("subscription_data[metadata][ownerEmail]", ownerEmail);
  params.set("subscription_data[metadata][ownerUsername]", ownerUsername);

  const created = await stripePostForm<{ id: string; url: string | null }>("/checkout/sessions", params);
  if (!created.ok) return err(created.error, created.status === 500 ? 500 : 502);
  if (!created.data.url) return err("Sessione Stripe senza URL.", 502);

  return ok({ id: created.data.id, url: created.data.url });
}
