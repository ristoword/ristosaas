import { prisma } from "@/lib/db/prisma";
import type { CourseStatus, Order, OrderItem, OrderOnlinePaymentStatus, OrderStatus } from "@/lib/api/types/orders";
import { restaurantOrderTotalCentsFromItems } from "@/lib/billing/stripe-restaurant-order";

type OrderFilters = {
  status?: string | null;
  table?: string | null;
  area?: string | null;
  active?: string | null;
  limit?: number;
  offset?: number;
};

function toCourseStates(input: unknown): Record<string, CourseStatus> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const entries = Object.entries(input as Record<string, unknown>);
  const states: Record<string, CourseStatus> = {};
  for (const [course, status] of entries) {
    if (
      status === "queued" ||
      status === "in_attesa" ||
      status === "in_preparazione" ||
      status === "pronto" ||
      status === "servito"
    ) {
      states[course] = status;
    }
  }
  return states;
}

function mapMenuItemAreaToOrderArea(raw: string): OrderItem["area"] {
  const v = (raw || "").toLowerCase().trim();
  if (v === "bar") return "bar";
  if (v === "pizzeria") return "pizzeria";
  if (v === "cucina" || v.includes("cucin")) return "cucina";
  return "sala";
}

function mergePublicOrderLines(items: Array<{ menuItemId: string; qty: number }>) {
  const m = new Map<string, number>();
  for (const line of items) {
    if (!Number.isFinite(line.qty) || line.qty < 1) continue;
    const id = line.menuItemId.trim();
    if (!id) continue;
    m.set(id, (m.get(id) ?? 0) + Math.floor(line.qty));
  }
  return [...m.entries()].map(([menuItemId, qty]) => ({ menuItemId, qty }));
}

function mapOrder(row: {
  id: string;
  table: string | null;
  covers: number | null;
  area: string;
  waiter: string;
  notes: string;
  activeCourse: number;
  courseStates: unknown;
  status: OrderStatus;
  onlinePaymentStatus: OrderOnlinePaymentStatus;
  stripeCheckoutSessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    menuItemId: string | null;
    name: string;
    qty: number;
    category: string | null;
    area: string;
    price: { toNumber: () => number } | null;
    note: string | null;
    course: number;
  }>;
}): Order {
  return {
    id: row.id,
    table: row.table,
    covers: row.covers,
    area: row.area as Order["area"],
    waiter: row.waiter,
    notes: row.notes,
    activeCourse: row.activeCourse,
    courseStates: toCourseStates(row.courseStates),
    status: row.status,
    onlinePaymentStatus: row.onlinePaymentStatus,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map(
      (item): OrderItem => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        qty: item.qty,
        category: item.category,
        area: item.area as OrderItem["area"],
        price: item.price ? item.price.toNumber() : null,
        note: item.note,
        course: item.course,
      }),
    ),
  };
}

export const ordersRepository = {
  async all(tenantId: string, filters?: OrderFilters) {
    const limit = Math.max(1, Math.min(200, Math.floor(filters?.limit ?? 100)));
    const offset = Math.max(0, Math.floor(filters?.offset ?? 0));
    const rows = await prisma.restaurantOrder.findMany({
      where: {
        tenantId,
        ...(filters?.status ? { status: filters.status as OrderStatus } : {}),
        ...(filters?.table ? { table: filters.table } : {}),
        ...(filters?.active === "true" ? { status: { notIn: ["chiuso", "annullato", "servito"] } } : {}),
        ...(filters?.area
          ? {
              OR: [{ area: filters.area as Order["area"] }, { items: { some: { area: filters.area as OrderItem["area"] } } }],
            }
          : {}),
      },
      skip: offset,
      take: limit,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return rows.map(mapOrder);
  },
  async get(tenantId: string, id: string) {
    const row = await prisma.restaurantOrder.findFirst({
      where: { tenantId, id },
      include: { items: true },
    });
    return row ? mapOrder(row) : null;
  },
  async create(
    tenantId: string,
    order: Omit<Order, "id" | "createdAt" | "updatedAt">,
  ) {
    const row = await prisma.restaurantOrder.create({
      data: {
        tenantId,
        table: order.table,
        covers: order.covers,
        area: order.area,
        waiter: order.waiter,
        notes: order.notes,
        activeCourse: order.activeCourse,
        courseStates: order.courseStates,
        status: order.status,
        onlinePaymentStatus: order.onlinePaymentStatus ?? "unpaid",
        stripeCheckoutSessionId: order.stripeCheckoutSessionId ?? null,
        items: {
          create: order.items.map((item) => ({
            name: item.name,
            qty: item.qty,
            category: item.category,
            area: item.area,
            price: item.price,
            note: item.note,
            course: item.course,
            ...(item.menuItemId ? { menuItemId: item.menuItemId } : {}),
          })),
        },
      },
      include: { items: true },
    });
    return mapOrder(row);
  },

  /**
   * Ordine inviato dal menu pubblico: prezzi e voci da DB, stato iniziale `pending`.
   */
  async createFromPublicMenu(
    tenantId: string,
    payload: {
      items: Array<{ menuItemId: string; qty: number }>;
      notes?: string | null;
      tableHint?: string | null;
      /** `RestaurantTable.id` nel tenant; `order.table` sarà il nome tavolo (compatibile con sala). */
      tableId?: string | null;
    },
  ) {
    let resolvedTableNome: string | null = null;
    if (payload.tableId?.trim()) {
      const tbl = await prisma.restaurantTable.findFirst({
        where: { tenantId, id: payload.tableId.trim() },
        select: { nome: true },
      });
      if (!tbl) throw new Error("Tavolo non valido o non appartenente alla struttura.");
      resolvedTableNome = tbl.nome;
    }

    const lines = mergePublicOrderLines(payload.items);
    if (lines.length === 0) throw new Error("Il carrello è vuoto.");

    const ids = lines.map((l) => l.menuItemId);
    const menuRows = await prisma.menuItem.findMany({
      where: { tenantId, id: { in: ids }, active: true },
    });
    if (menuRows.length !== ids.length) {
      throw new Error("Uno o più articoli non sono disponibili.");
    }
    const byId = new Map(menuRows.map((r) => [r.id, r]));

    const orderItems: OrderItem[] = lines.map((line) => {
      const row = byId.get(line.menuItemId)!;
      return {
        id: "",
        menuItemId: row.id,
        name: row.name,
        qty: line.qty,
        category: row.category,
        area: mapMenuItemAreaToOrderArea(row.area),
        price: row.price.toNumber(),
        note: null,
        course: 1,
      };
    });

    const mainArea: Order["area"] = orderItems.some((i) => i.area === "cucina")
      ? "cucina"
      : orderItems.some((i) => i.area === "bar")
        ? "bar"
        : orderItems.some((i) => i.area === "pizzeria")
          ? "pizzeria"
          : "sala";

    const courseNums = [...new Set(orderItems.map((item) => item.course))].sort((a, b) => a - b);
    const courseStates: Record<string, CourseStatus> = {};
    for (let idx = 0; idx < courseNums.length; idx += 1) {
      const course = courseNums[idx];
      courseStates[String(course)] = idx === 0 ? "in_attesa" : "queued";
    }

    const notesParts = [
      "Ordine da menu pubblico.",
      resolvedTableNome ? `Tavolo: ${resolvedTableNome}.` : null,
      !resolvedTableNome && payload.tableHint?.trim() ? `Riferimento tavolo/posto: ${payload.tableHint.trim()}` : null,
      resolvedTableNome && payload.tableHint?.trim() ? `Nota: ${payload.tableHint.trim()}` : null,
      payload.notes?.trim() || null,
    ].filter(Boolean) as string[];

    const order: Omit<Order, "id" | "createdAt" | "updatedAt"> = {
      table: resolvedTableNome ?? (payload.tableHint?.trim() || null),
      covers: null,
      area: mainArea,
      waiter: "Menu online",
      notes: notesParts.join(" "),
      items: orderItems,
      activeCourse: courseNums[0] ?? 1,
      courseStates,
      status: "pending",
      onlinePaymentStatus: "unpaid",
      stripeCheckoutSessionId: null,
    };
    return this.create(tenantId, order);
  },

  async setStripeCheckoutSessionId(tenantId: string, orderId: string, stripeCheckoutSessionId: string) {
    const existing = await prisma.restaurantOrder.findFirst({
      where: { id: orderId, tenantId, onlinePaymentStatus: "unpaid" },
    });
    if (!existing) return null;
    const row = await prisma.restaurantOrder.update({
      where: { id: orderId },
      data: { stripeCheckoutSessionId },
      include: { items: true },
    });
    if (row.tenantId !== tenantId) return null;
    return mapOrder(row);
  },

  async markOnlinePaymentPaidFromCheckout(args: {
    tenantId: string;
    orderId: string;
    stripeCheckoutSessionId: string;
    amountTotalCents: number;
    currency: string;
  }): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (args.currency.toLowerCase() !== "eur") return { ok: false, reason: "currency_mismatch" };

    const existing = await prisma.restaurantOrder.findFirst({
      where: { id: args.orderId, tenantId: args.tenantId },
      include: { items: true },
    });
    if (!existing) return { ok: false, reason: "order_not_found" };
    if (existing.onlinePaymentStatus === "paid") return { ok: true };

    const expectedCents = restaurantOrderTotalCentsFromItems(
      existing.items.map((i) => ({
        price: i.price ? i.price.toNumber() : null,
        qty: i.qty,
      })),
    );
    if (expectedCents !== args.amountTotalCents) return { ok: false, reason: "amount_mismatch" };

    if (
      existing.stripeCheckoutSessionId &&
      existing.stripeCheckoutSessionId !== args.stripeCheckoutSessionId
    ) {
      return { ok: false, reason: "session_mismatch" };
    }

    await prisma.restaurantOrder.update({
      where: { id: args.orderId },
      data: {
        onlinePaymentStatus: "paid",
        stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      },
    });
    return { ok: true };
  },

  async update(tenantId: string, id: string, updates: Partial<Order>) {
    const existing = await prisma.restaurantOrder.findFirst({
      where: { tenantId, id },
      include: { items: true },
    });
    if (!existing) return null;

    const row = await prisma.restaurantOrder.update({
      where: { id },
      data: {
        table: updates.table,
        covers: updates.covers,
        area: updates.area,
        waiter: updates.waiter,
        notes: updates.notes,
        activeCourse: updates.activeCourse,
        courseStates: updates.courseStates,
        status: updates.status,
        onlinePaymentStatus: updates.onlinePaymentStatus,
        stripeCheckoutSessionId: updates.stripeCheckoutSessionId,
        items: updates.items
          ? {
              deleteMany: {},
              create: updates.items.map((item) => ({
                name: item.name,
                qty: item.qty,
                category: item.category,
                area: item.area,
                price: item.price,
                note: item.note,
                course: item.course,
                ...(item.menuItemId ? { menuItemId: item.menuItemId } : {}),
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
    return mapOrder(row);
  },
  async delete(tenantId: string, id: string) {
    const existing = await prisma.restaurantOrder.findFirst({
      where: { tenantId, id },
    });
    if (!existing) return false;
    await prisma.restaurantOrder.delete({ where: { id } });
    return true;
  },

  /**
   * Promote a just-closed (or cancelled) restaurant order into the
   * `ArchivedOrder` table. Idempotent: relies on the unique index on
   * `sourceOrderId`, so calling it twice for the same order is a no-op.
   *
   * Returns the archived row (or `null` if the source order does not exist).
   */
  async archiveFromClosedOrder(
    tenantId: string,
    orderId: string,
    opts?: {
      paymentMethod?: "contanti" | "carta" | "misto";
      archivedStatus?: "completato" | "annullato" | "stornato";
    },
  ) {
    const source = await prisma.restaurantOrder.findFirst({
      where: { tenantId, id: orderId },
      include: { items: true },
    });
    if (!source) return null;

    const total = source.items.reduce(
      (sum, item) => sum + (item.price ? item.price.toNumber() : 0) * item.qty,
      0,
    );

    const archivedStatus =
      opts?.archivedStatus ??
      (source.status === "annullato" ? "annullato" : "completato");
    const paymentMethod = opts?.paymentMethod ?? "contanti";

    return prisma.archivedOrder.upsert({
      where: { sourceOrderId: orderId },
      update: {
        total,
        status: archivedStatus,
        paymentMethod,
        closedAt: new Date(),
      },
      create: {
        tenantId,
        sourceOrderId: orderId,
        date: source.createdAt,
        table: source.table ?? "—",
        waiter: source.waiter,
        items: source.items.map((item) => ({
          name: item.name,
          qty: item.qty,
          price: item.price ? item.price.toNumber() : 0,
        })),
        total,
        status: archivedStatus,
        paymentMethod,
        closedAt: new Date(),
      },
    });
  },
};
