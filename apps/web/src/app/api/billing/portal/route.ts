import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { stripePostForm } from "@/lib/billing/stripe-client";

const BILLING_ROLES = ["owner", "super_admin"] as const;

export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, BILLING_ROLES);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL || `${appUrl}/stripe`;

  const subscription = await prisma.billingSubscription.findFirst({
    where: {
      tenantId,
      stripeCustomerId: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { stripeCustomerId: true },
  });

  const customerId = subscription?.stripeCustomerId;
  if (!customerId) return err("No Stripe customer linked to tenant yet", 400);

  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.set("return_url", returnUrl);

  const created = await stripePostForm<{ id: string; url: string }>("/billing_portal/sessions", params);
  if (!created.ok) return err(created.error, created.status === 500 ? 500 : 502);

  return ok({ id: created.data.id, url: created.data.url });
}
