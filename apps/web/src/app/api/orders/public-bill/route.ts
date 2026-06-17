import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api/helpers";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";
import { getActivePublicTenantIdBySlug } from "@/lib/db/repositories/public-menu.repository";
import {
  createRestaurantOrderCheckoutSession,
  restaurantOrderTotalCentsFromItems,
} from "@/lib/billing/stripe-restaurant-order";

/**
 * POST /api/orders/public-bill
 * Unauthenticated endpoint for QR menu: gets the total bill for an
 * existing order (all courses combined) and optionally creates a
 * Stripe Checkout Session for online payment.
 */
export async function POST(req: NextRequest) {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const body = parsed as {
    tenantSlug?: string;
    orderId?: string;
    payOnline?: boolean;
  };

  if (!body?.tenantSlug || !body?.orderId) {
    return err("tenantSlug e orderId sono obbligatori.", 400);
  }

  const tenantId = await getActivePublicTenantIdBySlug(body.tenantSlug);
  if (!tenantId) return err("Struttura non trovata.", 404);

  const order = await ordersRepository.get(tenantId, body.orderId);
  if (!order) return err("Ordine non trovato.", 404);

  if (order.status === "chiuso" || order.status === "annullato") {
    return err("L'ordine è già chiuso.", 400);
  }

  const totalCents = restaurantOrderTotalCentsFromItems(
    order.items.map((i) => ({ price: i.price ?? 0, qty: i.qty })),
  );
  const totalEuros = totalCents / 100;

  if (!body.payOnline) {
    await ordersRepository.update(tenantId, body.orderId, { status: "conto_richiesto" });
    return ok({
      orderId: order.id,
      totalEuros,
      items: order.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        course: i.course,
      })),
      message: "Il conto è stato richiesto. Lo staff arriverà al tuo tavolo.",
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return err("Pagamento online non disponibile.", 503);
  }

  const slug = body.tenantSlug.trim();
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const successUrl = `${origin}/menu/${encodeURIComponent(slug)}/pagamento/ok?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/menu/${encodeURIComponent(slug)}/pagamento/annullato?order_id=${encodeURIComponent(order.id)}`;

  const session = await createRestaurantOrderCheckoutSession({
    tenantId,
    tenantSlug: slug,
    orderId: order.id,
    amountCents: totalCents,
    successUrl,
    cancelUrl,
  });

  if (!session.ok || !session.data.url) {
    return err("Impossibile creare la sessione di pagamento.", 502);
  }

  await ordersRepository.setStripeCheckoutSessionId(tenantId, order.id, session.data.id);

  return ok({
    orderId: order.id,
    totalEuros,
    stripeCheckoutUrl: session.data.url,
  });
}
