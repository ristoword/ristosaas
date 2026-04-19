import { NextRequest } from "next/server";
import type { Order } from "@/lib/api/types/orders";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";

const ORDER_ROLES = ["sala", "cassa", "cucina", "bar", "pizzeria", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const order = await ordersRepository.get(getTenantId(), id);
  if (!order) return err("Order not found", 404);
  return ok(order);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const updates = await body<Partial<Order>>(req);
  const updated = await ordersRepository.update(getTenantId(), id, updates);
  if (!updated) return err("Order not found", 404);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const deleted = await ordersRepository.delete(getTenantId(), id);
  if (!deleted) return err("Order not found", 404);
  return ok({ deleted: true });
}
