import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";

const ORDER_ROLES = ["sala", "cassa", "cucina", "bar", "pizzeria", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/orders/:id/marcia
 * Body: { course: number }
 *
 * "Marcia" mechanic: start preparing the given course. Semantics:
 *  - queued       → in_preparazione (marcia = partiamo)
 *  - in_attesa    → in_preparazione (partiamo davvero)
 *  - in_preparazione / pronto / servito → no-op (already running or done)
 *
 * Also sets this course as the current `activeCourse`, so KDS columns align.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = getTenantId();
  const order = await ordersRepository.get(tenantId, id);
  if (!order) return err("Order not found", 404);

  const { course } = await body<{ course: number }>(req);
  if (course == null) return err("course is required");

  const cs = { ...order.courseStates };
  const prior = cs[String(course)];
  if (prior === "queued" || prior === "in_attesa") {
    cs[String(course)] = "in_preparazione";
  }

  const updated = await ordersRepository.update(tenantId, id, {
    activeCourse: course,
    courseStates: cs,
    status: "in_preparazione",
  });
  if (!updated) return err("Order not found", 404);

  return ok(updated);
}
