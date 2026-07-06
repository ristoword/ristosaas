import { NextRequest } from "next/server";
import type { OrderItem, CourseStatus } from "@/lib/api/types/orders";
import { body, err, ok } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";
import { emitOrderAppended } from "@/lib/realtime/emit";

const ORDER_ROLES = ["sala", "cassa", "cucina", "bar", "pizzeria", "supervisor", "owner", "super_admin"] as const;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/orders/:id/append
 * Adds items to an existing active order (e.g. drinks, desserts).
 * New items get new course numbers appended after the existing ones.
 * The order stays in its current status.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const tenantId = getTenantId();
  let payload: { items: OrderItem[]; notes?: string };
  try {
    payload = await body<{ items: OrderItem[]; notes?: string }>(req);
  } catch {
    return err("Invalid JSON", 400);
  }

  if (!payload?.items?.length) return err("items are required", 400);

  const existing = await ordersRepository.get(tenantId, id);
  if (!existing) return err("Order not found", 404);

  if (["chiuso", "annullato", "conto_richiesto"].includes(existing.status)) {
    return err("Cannot add items to a closed/cancelled order", 400);
  }

  const existingCourses = [...new Set(existing.items.map((i) => i.course))].sort((a, b) => a - b);
  const maxExistingCourse = existingCourses.length > 0 ? Math.max(...existingCourses) : 0;

  const incomingCourses = [...new Set(payload.items.map((i) => i.course))].sort((a, b) => a - b);
  const courseRemap = new Map<number, number>();
  incomingCourses.forEach((c, idx) => {
    courseRemap.set(c, maxExistingCourse + idx + 1);
  });

  const remappedItems: OrderItem[] = payload.items.map((item) => ({
    ...item,
    course: courseRemap.get(item.course) ?? maxExistingCourse + 1,
  }));

  const mergedItems = [...existing.items, ...remappedItems];

  const newCourseStates: Record<string, CourseStatus> = { ...existing.courseStates };
  const newCourseNumbers = [...courseRemap.values()].sort((a, b) => a - b);
  for (const c of newCourseNumbers) {
    newCourseStates[String(c)] = "in_attesa";
  }

  const mergedNotes = payload.notes?.trim()
    ? existing.notes
      ? `${existing.notes} | ${payload.notes.trim()}`
      : payload.notes.trim()
    : existing.notes;

  const allCourseNums = [...new Set(mergedItems.map((i) => i.course))].sort((a, b) => a - b);
  const firstPending = allCourseNums.find((n) => newCourseStates[String(n)] !== "servito");
  const newActiveCourse = firstPending ?? newCourseNumbers[0] ?? existing.activeCourse;
  const statusUpdate = existing.status === "servito" ? "in_attesa" : existing.status;

  const updated = await ordersRepository.update(tenantId, id, {
    items: mergedItems,
    courseStates: newCourseStates,
    notes: mergedNotes,
    status: statusUpdate,
    activeCourse: newActiveCourse,
  });

  if (!updated) return err("Failed to update order", 500);

  emitOrderAppended(tenantId, updated);

  return ok(updated);
}
