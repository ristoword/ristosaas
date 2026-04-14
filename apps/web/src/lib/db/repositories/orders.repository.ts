import { prisma } from "@/lib/db/prisma";
import type { CourseStatus, Order, OrderItem, OrderStatus } from "@/lib/api/types/orders";

type OrderFilters = {
  status?: string | null;
  table?: string | null;
  area?: string | null;
  active?: string | null;
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
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map(
      (item): OrderItem => ({
        id: item.id,
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
    const rows = await prisma.restaurantOrder.findMany({
      where: {
        tenantId,
        ...(filters?.status ? { status: filters.status as OrderStatus } : {}),
        ...(filters?.table ? { table: filters.table } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    let mapped = rows.map(mapOrder);
    if (filters?.area) {
      mapped = mapped.filter(
        (order) => order.area === filters.area || order.items.some((item) => item.area === filters.area),
      );
    }
    if (filters?.active === "true") {
      mapped = mapped.filter((order) => !["chiuso", "annullato", "servito"].includes(order.status));
    }
    return mapped;
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
        items: {
          create: order.items.map((item) => ({
            name: item.name,
            qty: item.qty,
            category: item.category,
            area: item.area,
            price: item.price,
            note: item.note,
            course: item.course,
          })),
        },
      },
      include: { items: true },
    });
    return mapOrder(row);
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
};
