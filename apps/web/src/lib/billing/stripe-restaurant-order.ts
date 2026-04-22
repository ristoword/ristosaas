import { stripePostForm } from "@/lib/billing/stripe-client";

/** Totale ordine in centesimi EUR (allineato a Stripe `amount_total`). */
export function restaurantOrderTotalCentsFromItems(items: Array<{ price: number | null; qty: number }>): number {
  const euros = items.reduce((sum, row) => sum + (row.price ?? 0) * row.qty, 0);
  return Math.round(euros * 100);
}

const MIN_CHECKOUT_CENTS = 50;

export async function createRestaurantOrderCheckoutSession(input: {
  tenantId: string;
  tenantSlug: string;
  orderId: string;
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
}) {
  if (input.amountCents < MIN_CHECKOUT_CENTS) {
    return {
      ok: false as const,
      status: 400,
      error: "Importo minimo per pagamento online non raggiunto (min. €0,50).",
    };
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("client_reference_id", input.orderId);
  params.set("line_items[0][price_data][currency]", "eur");
  params.set("line_items[0][price_data][product_data][name]", `Ordine menu (${input.tenantSlug})`);
  params.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[purpose]", "restaurant_order");
  params.set("metadata[tenantId]", input.tenantId);
  params.set("metadata[restaurantOrderId]", input.orderId);
  params.set("metadata[tenantSlug]", input.tenantSlug);

  return stripePostForm<{ id: string; url: string | null }>("/checkout/sessions", params);
}
