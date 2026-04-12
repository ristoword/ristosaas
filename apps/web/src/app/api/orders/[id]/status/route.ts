import { NextRequest } from "next/server";
import { db, uid } from "@/lib/api/store";
import type { OrderStatus } from "@/lib/api/types/orders";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const ORDER_ROLES = ["sala", "cassa", "cucina", "bar", "pizzeria", "supervisor"] as const;

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/orders/:id/status
 * Body: { status: OrderStatus }
 *
 * Handles course progression logic + warehouse discharge on "servito"/"chiuso".
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const order = db.orders.get(id);
  if (!order) return err("Order not found", 404);

  const { status } = await body<{ status: OrderStatus }>(req);
  if (!status) return err("status is required");

  const cs = { ...order.courseStates };
  const nums = [...new Set(order.items.map((i) => i.course))].sort((a, b) => a - b);
  const current = nums.find((n) => cs[String(n)] !== "servito");
  let newActiveCourse = order.activeCourse;
  let newStatus: OrderStatus = status;

  if (current != null) {
    if (status === "in_preparazione") {
      cs[String(current)] = "in_preparazione";
    }

    if (status === "pronto") {
      const lastN = nums[nums.length - 1];
      if (current !== lastN) {
        cs[String(current)] = "servito";
        const next = nums.find((n) => cs[String(n)] !== "servito");
        if (next != null) {
          cs[String(next)] = "in_attesa";
          newActiveCourse = next;
        }
        newStatus = "in_attesa";
      } else {
        cs[String(current)] = "pronto";
        newStatus = "in_attesa";
      }
    }

    if (status === "servito") {
      const lastN = nums[nums.length - 1];
      if (current === lastN && cs[String(current)] === "pronto") {
        cs[String(current)] = "servito";
        newStatus = "servito";
      }
    }
  }

  const updated = { ...order, status: newStatus, courseStates: cs, activeCourse: newActiveCourse, updatedAt: new Date().toISOString() };
  db.orders.set(id, updated);

  let discharge = null;
  if (newStatus === "servito" || status === "chiuso") {
    discharge = dischargeOrderFromWarehouse(updated);
  }

  return ok({ order: updated, discharge });
}

function dischargeOrderFromWarehouse(order: typeof db.orders extends { get: (id: string) => infer T | undefined } ? NonNullable<T> : never) {
  const reports: { dishName: string; totalCost: number; ingredients: { name: string; qty: number; unit: string; cost: number }[] }[] = [];

  for (const item of order.items) {
    const recipe = db.recipes.all().find((r) => r.name.toLowerCase() === item.name.toLowerCase());
    if (!recipe) continue;

    const report = { dishName: item.name, totalCost: 0, ingredients: [] as { name: string; qty: number; unit: string; cost: number }[] };

    for (const ing of recipe.ingredients) {
      const totalQty = ing.qty * item.qty;
      const stockItem = db.stock.findByName(ing.name);
      const unitCost = stockItem ? stockItem.costPerUnit : ing.unitCost;
      const cost = totalQty * unitCost;

      if (stockItem) {
        db.stock.set(stockItem.id, { ...stockItem, qty: Math.max(0, stockItem.qty - totalQty) });
      }

      report.ingredients.push({ name: ing.name, qty: totalQty, unit: ing.unit, cost });
      report.totalCost += cost;

      db.stockMovements.push({
        id: uid("mv"),
        date: new Date().toISOString().slice(0, 10),
        productId: stockItem?.id ?? "unknown",
        productName: ing.name,
        type: "scarico_comanda",
        qty: totalQty,
        unit: ing.unit,
        reason: `Scarico per ${item.name} x${item.qty} (ordine ${order.id})`,
        orderId: order.id,
      });
    }

    reports.push(report);
  }

  return reports;
}
