import type { CourseStatus, Order, OrderItem } from "@/lib/api/types/orders";
import { uid } from "@/lib/store/id";

const orders = new Map<string, Order>();

function buildCourseStates(items: OrderItem[]): Record<string, CourseStatus> {
  const nums = [...new Set(items.map((i) => i.course))].sort((a, b) => a - b);
  const cs: Record<string, CourseStatus> = {};
  if (!nums.length) return cs;
  for (const n of nums) cs[String(n)] = n === nums[0] ? "in_attesa" : "queued";
  return cs;
}

const SEED_ORDERS: Omit<Order, "id" | "courseStates" | "activeCourse" | "status" | "createdAt" | "updatedAt">[] = [
  {
    table: "5",
    covers: 4,
    area: "sala",
    waiter: "Marco",
    notes: "Allergia noci",
    items: [
      { id: "i1", name: "Bruschetta mista", qty: 2, category: "antipasti", area: "cucina", price: 8, note: null, course: 1 },
      { id: "i2", name: "Supplì al telefono", qty: 4, category: "antipasti", area: "cucina", price: 3, note: null, course: 1 },
      { id: "i3", name: "Carbonara", qty: 2, category: "primi", area: "cucina", price: 12, note: "senza guanciale extra", course: 2 },
      { id: "i4", name: "Amatriciana", qty: 2, category: "primi", area: "cucina", price: 11, note: null, course: 2 },
      { id: "i5", name: "Tagliata", qty: 3, category: "secondi", area: "cucina", price: 18, note: null, course: 3 },
      { id: "i6", name: "Negroni", qty: 2, category: "cocktail", area: "bar", price: 9, note: null, course: 1 },
    ],
  },
  {
    table: "3",
    covers: 2,
    area: "sala",
    waiter: "Laura",
    notes: "",
    items: [
      { id: "i7", name: "Margherita", qty: 1, category: "pizze", area: "pizzeria", price: 8, note: null, course: 1 },
      { id: "i8", name: "Diavola", qty: 1, category: "pizze", area: "pizzeria", price: 10, note: "doppia mozzarella", course: 1 },
      { id: "i9", name: "Birra media", qty: 2, category: "bevande", area: "bar", price: 5, note: null, course: 1 },
    ],
  },
];

for (const seed of SEED_ORDERS) {
  const id = uid("ord");
  const now = new Date().toISOString();
  const courseStates = buildCourseStates(seed.items);
  const nums = [...new Set(seed.items.map((i) => i.course))].sort((a, b) => a - b);
  orders.set(id, { ...seed, id, activeCourse: nums[0] ?? 1, courseStates, status: "in_attesa", createdAt: now, updatedAt: now });
}

export const ordersStore = {
  all: () => [...orders.values()],
  get: (id: string) => orders.get(id),
  set: (id: string, order: Order) => orders.set(id, order),
  delete: (id: string) => orders.delete(id),
  size: () => orders.size,
  buildCourseStates,
};
