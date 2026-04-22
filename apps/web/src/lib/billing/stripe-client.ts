const STRIPE_API_BASE = "https://api.stripe.com/v1";

type StripeRequestResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  status: number;
  error: string;
};

function getStripeSecretKey() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  return secret;
}

export async function stripePostForm<T>(path: string, params: URLSearchParams): Promise<StripeRequestResult<T>> {
  const secret = getStripeSecretKey();
  if (!secret) return { ok: false, status: 500, error: "STRIPE_SECRET_KEY missing" };

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    const message = payload?.error?.message || `Stripe request failed (${response.status})`;
    return { ok: false, status: response.status, error: message };
  }
  return { ok: true, data: payload as T };
}

export async function stripeGet<T>(path: string): Promise<StripeRequestResult<T>> {
  const secret = getStripeSecretKey();
  if (!secret) return { ok: false, status: 500, error: "STRIPE_SECRET_KEY missing" };

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as any;
  if (!response.ok) {
    const message = payload?.error?.message || `Stripe request failed (${response.status})`;
    return { ok: false, status: response.status, error: message };
  }
  return { ok: true, data: payload as T };
}
