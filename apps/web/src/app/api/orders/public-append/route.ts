import { NextRequest } from "next/server";
import type { OrderItem, CourseStatus } from "@/lib/api/types/orders";
import { err, ok } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";
import { getActivePublicTenantIdBySlug } from "@/lib/db/repositories/public-menu.repository";

/**
 * POST /api/orders/public-append
 * Unauthenticated endpoint for QR menu: appends items to an existing
 * order created via public_menu. Creates a new "course" so each
 * submission appears as a separate comanda in the kitchen, but stays
 * linked to the same order/table for billing.
 */
export async function POST(req: NextRequest) {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const body = parsed as {
    tenantSlug?: string;
    orderId?: string;
    items?: Array<{ menuItemId: string; qty: number }>;
  };

  if (!body?.tenantSlug || !body?.orderId || !Array.isArray(body?.items) || body.items.length === 0) {
    return err("tenantSlug, orderId e items sono obbligatori.", 400);
  }

  const tenantId = await getActivePublicTenantIdBySlug(body.tenantSlug);
  if (!tenantId) return err("Struttura non trovata.", 404);

  const existing = await ordersRepository.get(tenantId, body.orderId);
  if (!existing) return err("Ordine non trovato.", 404);

  if (["chiuso", "annullato", "servito"].includes(existing.status)) {
    return err("L'ordine è già chiuso.", 400);
  }

  const ids = body.items.map((l) => l.menuItemId.trim()).filter(Boolean);
  const menuRows = await prisma.menuItem.findMany({
    where: { tenantId, id: { in: ids }, active: true },
  });
  if (menuRows.length !== new Set(ids).size) {
    return err("Uno o più articoli non sono disponibili.", 400);
  }
  const byId = new Map(menuRows.map((r) => [r.id, r]));

  const existingCourses = [...new Set(existing.items.map((i) => i.course))].sort((a, b) => a - b);
  const maxCourse = existingCourses.length > 0 ? Math.max(...existingCourses) : 0;
  const newCourseNum = maxCourse + 1;

  const newItems: OrderItem[] = body.items.map((line) => {
    const row = byId.get(line.menuItemId.trim())!;
    const area = mapArea(row.area);
    return {
      id: "",
      menuItemId: row.id,
      name: row.name,
      qty: Math.max(1, Math.floor(line.qty)),
      category: row.category,
      area,
      price: row.price.toNumber(),
      note: null,
      course: newCourseNum,
    };
  });

  const mergedItems = [...existing.items, ...newItems];

  const newCourseStates: Record<string, CourseStatus> = { ...existing.courseStates };
  newCourseStates[String(newCourseNum)] = "in_attesa";

  const updated = await ordersRepository.update(tenantId, body.orderId, {
    items: mergedItems,
    courseStates: newCourseStates,
    notes: existing.notes,
  });

  if (!updated) return err("Impossibile aggiornare l'ordine.", 500);
  return ok({ orderId: updated.id, course: newCourseNum });
}

function mapArea(raw: string): OrderItem["area"] {
  const v = (raw || "").toLowerCase().trim();
  if (v === "bar") return "bar";
  if (v === "pizzeria") return "pizzeria";
  if (v === "cucina" || v.includes("cucin")) return "cucina";
  return "sala";
}
