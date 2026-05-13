const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_TIMEOUT_MS = 15_000;
const STRIPE_MAX_RETRIES = 2;
const STRIPE_RETRY_DELAY_MS = 1000;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = STRIPE_MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, STRIPE_RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      return res;
    } catch (error) {
      if (attempt >= retries) throw error;
      await new Promise((r) => setTimeout(r, STRIPE_RETRY_DELAY_MS * (attempt + 1)));
    }
  }
}

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

  const response = await fetchWithRetry(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    signal: AbortSignal.timeout(STRIPE_TIMEOUT_MS),
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

  const response = await fetchWithRetry(`${STRIPE_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
    signal: AbortSignal.timeout(STRIPE_TIMEOUT_MS),
  });

  const payload = (await response.json().catch(() => null)) as any;
  if (!response.ok) {
    const message = payload?.error?.message || `Stripe request failed (${response.status})`;
    return { ok: false, status: response.status, error: message };
  }
  return { ok: true, data: payload as T };
}
