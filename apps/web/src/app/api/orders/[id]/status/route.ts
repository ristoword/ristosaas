import { NextRequest } from "next/server";
import type { Order, OrderStatus } from "@/lib/api/types/orders";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";
import { kitchenMenuRepository } from "@/lib/db/repositories/kitchen-menu.repository";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";
import { prisma } from "@/lib/db/prisma";

const ORDER_ROLES = ["sala", "cassa", "cucina", "bar", "pizzeria", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/orders/:id/status
 * Body: { status: OrderStatus }
 *
 * Handles course progression logic + warehouse discharge on "servito"/"chiuso".
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const tenantId = getTenantId();
  const order = await ordersRepository.get(tenantId, id);
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
      newStatus = "in_preparazione";
    }

    if (status === "pronto") {
      cs[String(current)] = "pronto";
      newStatus = "pronto";
    }

    if (status === "servito") {
      cs[String(current)] = "servito";
      const next = nums.find((n) => cs[String(n)] !== "servito");
      if (next != null) {
        cs[String(next)] = "in_attesa";
        newActiveCourse = next;
        newStatus = "in_attesa";
      } else {
        newStatus = "servito";
      }
    }
  }

  const updated = await ordersRepository.update(tenantId, id, {
    status: newStatus,
    courseStates: cs,
    activeCourse: newActiveCourse,
  });
  if (!updated) return err("Order not found", 404);

  let discharge = {
    reports: [] as Array<{ course: number; dishName: string; totalCost: number; ingredients: { name: string; qty: number; unit: string; cost: number }[] }>,
    alerts: [] as Array<{ itemId: string; itemName: string; qty: number; minStock: number; level: "warning" | "critical" }>,
  };
  const dischargedCourses = await getAlreadyDischargedCourses(tenantId, order.id);

  if (status === "servito" && current != null && !dischargedCourses.has(current)) {
    const courseDischarge = await dischargeCourseFromWarehouse(tenantId, updated, current);
    discharge.reports.push(...courseDischarge.reports);
    discharge.alerts.push(...courseDischarge.alerts);
  }

  if (status === "chiuso" && order.status !== "chiuso") {
    const pendingCourses = nums.filter((courseNo) => !dischargedCourses.has(courseNo));
    for (const courseNo of pendingCourses) {
      const courseDischarge = await dischargeCourseFromWarehouse(tenantId, updated, courseNo);
      discharge.reports.push(...courseDischarge.reports);
      discharge.alerts.push(...courseDischarge.alerts);
    }
  }

  // Auto-archive on transition to a terminal state. Idempotent at the
  // repository level (unique index on sourceOrderId).
  let archived: { id: string } | null = null;
  if (status === "chiuso" && order.status !== "chiuso") {
    const row = await ordersRepository.archiveFromClosedOrder(tenantId, updated.id, {
      archivedStatus: "completato",
    });
    archived = row ? { id: row.id } : null;
  } else if (status === "annullato" && order.status !== "annullato") {
    const row = await ordersRepository.archiveFromClosedOrder(tenantId, updated.id, {
      archivedStatus: "annullato",
    });
    archived = row ? { id: row.id } : null;
  }

  return ok({ order: updated, discharge, archived });
}

async function getAlreadyDischargedCourses(tenantId: string, orderId: string) {
  const rows = await prisma.warehouseMovement.findMany({
    where: {
      tenantId,
      orderId,
      type: "scarico_comanda",
    },
    select: { reason: true },
  });
  const set = new Set<number>();
  for (const row of rows) {
    const match = row.reason.match(/course:(\d+)/);
    if (match) set.add(Number(match[1]));
  }
  return set;
}

async function dischargeCourseFromWarehouse(tenantId: string, order: Order, course: number) {
  const reports: { course: number; dishName: string; totalCost: number; ingredients: { name: string; qty: number; unit: string; cost: number }[] }[] = [];
  const alerts: Array<{ itemId: string; itemName: string; qty: number; minStock: number; level: "warning" | "critical" }> = [];

  for (const item of order.items.filter((row) => row.course === course)) {
    const recipe = await kitchenMenuRepository.findRecipeByName(tenantId, item.name);
    if (!recipe) continue;

    const report = {
      course,
      dishName: item.name,
      totalCost: 0,
      ingredients: [] as { name: string; qty: number; unit: string; cost: number }[],
    };

    for (const ing of recipe.ingredients) {
      const totalQty = ing.qty * item.qty;
      const stockItem = await warehouseRepository.findByName(tenantId, ing.name);
      const unitCost = stockItem ? stockItem.costPerUnit : ing.unitCost;
      const cost = totalQty * unitCost;

      if (stockItem) {
        const nextQty = Math.max(0, stockItem.qty - totalQty);
        await warehouseRepository.updateItem(tenantId, stockItem.id, { qty: nextQty });
        await warehouseRepository.createMovement({
          tenantId,
          warehouseItemId: stockItem.id,
          type: "scarico_comanda",
          qty: totalQty,
          unit: ing.unit,
          reason: `Scarico per ${item.name} x${item.qty} (order:${order.id};course:${course})`,
          orderId: order.id,
        });
        if (nextQty <= stockItem.minStock) {
          alerts.push({
            itemId: stockItem.id,
            itemName: stockItem.name,
            qty: nextQty,
            minStock: stockItem.minStock,
            level: nextQty <= 0 ? "critical" : "warning",
          });
        }
      }

      report.ingredients.push({ name: ing.name, qty: totalQty, unit: ing.unit, cost });
      report.totalCost += cost;
    }

    reports.push(report);
  }

  return { reports, alerts };
}
