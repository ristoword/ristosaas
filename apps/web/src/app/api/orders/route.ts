import { NextRequest } from "next/server";
import type { Order, OrderItem } from "@/lib/api/types/orders";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";
import { getActivePublicTenantIdBySlug } from "@/lib/db/repositories/public-menu.repository";
import {
  createRestaurantOrderCheckoutSession,
  restaurantOrderTotalCentsFromItems,
} from "@/lib/billing/stripe-restaurant-order";

const ORDER_ROLES = ["sala", "cassa", "cucina", "bar", "pizzeria", "supervisor", "owner", "super_admin"] as const;

type PublicMenuOrderBody = {
  source: "public_menu";
  tenantSlug: string;
  items: Array<{ menuItemId: string; qty: number }>;
  notes?: string | null;
  tableHint?: string | null;
  tableId?: string | null;
  /** Se true, crea anche una Stripe Checkout Session e restituisce `stripeCheckoutUrl`. */
  payOnline?: boolean;
};

function isPublicMenuOrderBody(v: unknown): v is PublicMenuOrderBody {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (o.source !== "public_menu") return false;
  if (typeof o.tenantSlug !== "string" || !o.tenantSlug.trim()) return false;
  if (!Array.isArray(o.items)) return false;
  for (const it of o.items) {
    if (!it || typeof it !== "object" || Array.isArray(it)) return false;
    const row = it as Record<string, unknown>;
    if (typeof row.menuItemId !== "string" || !row.menuItemId.trim()) return false;
    const qty = row.qty;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) return false;
  }
  if (o.notes !== undefined && o.notes !== null && typeof o.notes !== "string") return false;
  if (o.tableHint !== undefined && o.tableHint !== null && typeof o.tableHint !== "string") return false;
  if (o.tableId !== undefined && o.tableId !== null && typeof o.tableId !== "string") return false;
  if (o.payOnline !== undefined && typeof o.payOnline !== "boolean") return false;
  return true;
}

/** GET /api/orders?status=in_attesa&area=cucina&table=5 */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { searchParams } = req.nextUrl;
  const results = await ordersRepository.all(getTenantId(), {
    status: searchParams.get("status"),
    area: searchParams.get("area"),
    table: searchParams.get("table"),
    active: searchParams.get("active"),
    limit: Number(searchParams.get("limit") || 100),
    offset: Number(searchParams.get("offset") || 0),
  });
  return ok(results);
}

/** POST /api/orders — staff (autenticato) o menu pubblico (`source: "public_menu"`). */
export async function POST(req: NextRequest) {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  if (isPublicMenuOrderBody(parsed)) {
    const tenantId = await getActivePublicTenantIdBySlug(parsed.tenantSlug);
    if (!tenantId) return err("Struttura non trovata o non disponibile.", 404);
    const slug = parsed.tenantSlug.trim();
    const payOnline = parsed.payOnline === true;

    try {
      const order = await ordersRepository.createFromPublicMenu(tenantId, {
        items: parsed.items,
        notes: parsed.notes,
        tableHint: parsed.tableHint,
        tableId: parsed.tableId?.trim() || null,
      });

      if (!payOnline) {
        return ok(order, 201);
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        await ordersRepository.delete(tenantId, order.id);
        return err("Pagamento online non disponibile (Stripe non configurato).", 503);
      }

      const amountCents = restaurantOrderTotalCentsFromItems(
        order.items.map((i) => ({ price: i.price, qty: i.qty })),
      );

      const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
      const successUrl = `${origin}/menu/${encodeURIComponent(slug)}/pagamento/ok?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}/menu/${encodeURIComponent(slug)}/pagamento/annullato?order_id=${encodeURIComponent(order.id)}`;

      const session = await createRestaurantOrderCheckoutSession({
        tenantId,
        tenantSlug: slug,
        orderId: order.id,
        amountCents,
        successUrl,
        cancelUrl,
      });

      if (!session.ok || !session.data.url) {
        await ordersRepository.delete(tenantId, order.id);
        return err(
          session.ok ? "Stripe non ha restituito un URL di pagamento." : session.error,
          session.ok ? 502 : session.status >= 400 ? session.status : 502,
        );
      }

      const updated = await ordersRepository.setStripeCheckoutSessionId(tenantId, order.id, session.data.id);
      if (!updated) {
        await ordersRepository.delete(tenantId, order.id);
        return err("Impossibile collegare la sessione di pagamento.", 500);
      }

      return ok({ order: updated, stripeCheckoutUrl: session.data.url }, 201);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Impossibile creare l'ordine.";
      return err(message, 400);
    }
  }

  const guard = await requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const data = parsed as Omit<
    Order,
    "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status" | "onlinePaymentStatus" | "stripeCheckoutSessionId"
  >;
  if (!data.items?.length) return err("items are required");

  const courseStates = buildCourseStates(data.items);
  const nums = [...new Set(data.items.map((i: OrderItem) => i.course))].sort((a, b) => a - b);

  const orderPayload: Omit<Order, "id" | "createdAt" | "updatedAt"> = {
    ...data,
    activeCourse: nums[0] ?? 1,
    courseStates,
    status: "in_attesa",
    onlinePaymentStatus: "unpaid",
    stripeCheckoutSessionId: null,
  };
  const order = await ordersRepository.create(getTenantId(), orderPayload);
  return ok(order, 201);
}

function buildCourseStates(items: OrderItem[]): Record<string, "queued" | "in_attesa" | "in_preparazione" | "pronto" | "servito"> {
  const courseNums = [...new Set(items.map((item) => item.course))].sort((a, b) => a - b);
  const states: Record<string, "queued" | "in_attesa" | "in_preparazione" | "pronto" | "servito"> = {};
  for (let idx = 0; idx < courseNums.length; idx += 1) {
    const course = courseNums[idx];
    states[String(course)] = idx === 0 ? "in_attesa" : "queued";
  }
  return states;
}
