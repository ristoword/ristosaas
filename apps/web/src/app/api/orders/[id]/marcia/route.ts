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
 * Advance to next course ("marcia" mechanic).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = getTenantId();
  const order = await ordersRepository.get(tenantId, id);
  if (!order) return err("Order not found", 404);

  const { course } = await body<{ course: number }>(req);
  if (course == null) return err("course is required");

  const cs = { ...order.courseStates };
  if (cs[String(course)] === "queued") {
    cs[String(course)] = "in_attesa";
  }

  const updated = await ordersRepository.update(tenantId, id, {
    activeCourse: course,
    courseStates: cs,
  });
  if (!updated) return err("Order not found", 404);

  return ok(updated);
}
