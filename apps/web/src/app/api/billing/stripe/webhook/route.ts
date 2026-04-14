import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { billingRepository } from "@/lib/db/repositories/billing.repository";

function parseStripeSignature(header: string | null) {
  if (!header) return null;
  const entries = header.split(",").map((part) => part.trim());
  const map = new Map<string, string>();
  for (const entry of entries) {
    const [k, v] = entry.split("=");
    if (k && v) map.set(k, v);
  }
  const timestamp = map.get("t");
  const signature = map.get("v1");
  if (!timestamp || !signature) return null;
  return { timestamp, signature };
}

function verifyWebhookSignature(rawBody: string, header: string | null, secret: string) {
  const parsed = parseStripeSignature(header);
  if (!parsed) return false;
  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const digest = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expected = Buffer.from(digest, "hex");
  const provided = Buffer.from(parsed.signature, "hex");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return err("STRIPE_WEBHOOK_SECRET missing", 500);

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return err("Invalid webhook signature", 400);
  }

  const event = JSON.parse(rawBody);
  const result = await billingRepository.processStripeEvent(event);
  return ok(result);
}
