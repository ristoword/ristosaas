import { NextRequest } from "next/server";
import { db } from "@/lib/api/store";
import type { Order } from "@/lib/api/types/orders";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const ORDER_ROLES = ["sala", "cassa", "cucina", "bar", "pizzeria", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const order = db.orders.get(id);
  if (!order) return err("Order not found", 404);
  return ok(order);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const existing = db.orders.get(id);
  if (!existing) return err("Order not found", 404);
  const updates = await body<Partial<Order>>(req);
  const updated: Order = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
  db.orders.set(id, updated);
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  if (!db.orders.get(id)) return err("Order not found", 404);
  db.orders.delete(id);
  return ok({ deleted: true });
}
