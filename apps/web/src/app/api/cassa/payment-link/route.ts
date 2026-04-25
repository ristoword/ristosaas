import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { stripePostForm } from "@/lib/billing/stripe-client";

const ROLES = ["sala", "cassa", "supervisor", "owner", "super_admin"] as const;

/**
 * POST /api/cassa/payment-link
 * Crea un Stripe Checkout Session per il pagamento online di un conto.
 * Se Stripe non è configurato restituisce un URL placeholder.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  const data = await body<{
    amount: number;        // importo in euro (es. 47.50)
    description?: string;  // es. "Tavolo 5 — 4 coperti"
    successUrl?: string;
    cancelUrl?: string;
  }>(req);

  if (!data.amount || data.amount <= 0) return err("amount non valido", 400);

  const amountCents = Math.round(data.amount * 100);
  const description = data.description ?? "Conto ristorante";

  const host = req.nextUrl.origin;
  const successUrl = data.successUrl ?? `${host}/dashboard?payment=success`;
  const cancelUrl = data.cancelUrl ?? `${host}/cassa?payment=cancelled`;

  const params = new URLSearchParams({
    "payment_method_types[]": "card",
    "mode": "payment",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(amountCents),
    "line_items[0][price_data][product_data][name]": description,
    "line_items[0][quantity]": "1",
    "success_url": successUrl,
    "cancel_url": cancelUrl,
  });

  const result = await stripePostForm<{ id: string; url: string }>("/checkout/sessions", params);

  if (!result.ok) {
    // Stripe non configurato: restituiamo un link placeholder con QR dell'importo
    const fallbackUrl = `https://pay.ristoword.app?amount=${data.amount}&desc=${encodeURIComponent(description)}`;
    return ok({ url: fallbackUrl, sessionId: null, stripeConfigured: false });
  }

  return ok({ url: result.data.url, sessionId: result.data.id, stripeConfigured: true });
}
