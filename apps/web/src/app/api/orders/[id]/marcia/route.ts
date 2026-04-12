import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

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
  const order = db.orders.get(id);
  if (!order) return err("Order not found", 404);

  const { course } = await body<{ course: number }>(req);
  if (course == null) return err("course is required");

  const cs = { ...order.courseStates };
  if (cs[String(course)] === "queued") {
    cs[String(course)] = "in_attesa";
  }

  const updated = { ...order, activeCourse: course, courseStates: cs, updatedAt: new Date().toISOString() };
  db.orders.set(id, updated);

  return ok(updated);
}
