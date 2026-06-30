import type { Order, OrderItem } from "@/components/orders/types";
import type { SalaTable } from "@/lib/api-client";

/** Etichette portata per numero corso (sistema esistente). */
export const COURSE_SECTION_LABELS: Record<number, string> = {
  1: "Antipasti",
  2: "Primi",
  3: "Secondi",
  4: "Contorni",
  5: "Dessert",
  6: "Bevande",
};

const BEVANDE_RE = /bevand|birre|vini|bar|caff|drink|acqua|cola|spumante/i;

export function isBevandaItem(item: OrderItem): boolean {
  if (item.area === "bar") return true;
  const cat = item.category ?? "";
  return BEVANDE_RE.test(cat) || BEVANDE_RE.test(item.name);
}

export type ItemDisplayStatus = "pending" | "prep" | "served" | "cancelled";

export function getItemDisplayStatus(order: Order, item: OrderItem): ItemDisplayStatus {
  if (order.status === "annullato") return "cancelled";
  const st = order.courseStates[String(item.course)] ?? "queued";
  if (st === "servito" || st === "pronto") return "served";
  if (st === "in_preparazione") return "prep";
  return "pending";
}

export function itemStatusIcon(status: ItemDisplayStatus): string {
  switch (status) {
    case "served":
      return "🟢";
    case "prep":
      return "🟡";
    case "cancelled":
      return "⚫";
    default:
      return "○";
  }
}

export function itemStatusPrefix(status: ItemDisplayStatus): string {
  switch (status) {
    case "served":
      return "✓";
    case "cancelled":
      return "✕";
    default:
      return "•";
  }
}

export type GroupedSection = {
  key: string;
  label: string;
  items: Array<{ order: Order; item: OrderItem; itemKey: string }>;
};

export function groupOrderItems(orders: Order[]): GroupedSection[] {
  const bevande: GroupedSection["items"] = [];
  const byCourse = new Map<number, GroupedSection["items"]>();

  for (const order of orders) {
    for (const item of order.items) {
      const entry = { order, item, itemKey: `${order.id}-${item.id}` };
      if (isBevandaItem(item)) {
        bevande.push(entry);
        continue;
      }
      const course = item.course || 1;
      if (!byCourse.has(course)) byCourse.set(course, []);
      byCourse.get(course)!.push(entry);
    }
  }

  const sections: GroupedSection[] = [];
  const courseNums = [...byCourse.keys()].sort((a, b) => a - b);
  for (const cn of courseNums) {
    const items = byCourse.get(cn)!;
    if (items.length === 0) continue;
    sections.push({
      key: `course-${cn}`,
      label: COURSE_SECTION_LABELS[cn] ?? `Corso ${cn}`,
      items,
    });
  }
  if (bevande.length > 0) {
    sections.push({ key: "bevande", label: "Bevande", items: bevande });
  }
  return sections;
}

export function computeTableSummary(orders: Order[], table: SalaTable) {
  const allItems = orders.flatMap((o) => o.items.map((item) => ({ order: o, item })));
  const itemCount = allItems.reduce((s, { item }) => s + item.qty, 0);
  const total = allItems.reduce((s, { item }) => s + (item.price ?? 0) * item.qty, 0);

  const courseStates = new Map<number, string>();
  for (const order of orders) {
    for (const [cn, st] of Object.entries(order.courseStates)) {
      courseStates.set(Number(cn), st);
    }
  }
  let servedCourses = 0;
  let kitchenCourses = 0;
  for (const st of courseStates.values()) {
    if (st === "servito") servedCourses += 1;
    else if (st === "in_preparazione" || st === "pronto" || st === "in_attesa") kitchenCourses += 1;
  }

  const timestamps = orders.map((o) => ({
    created: new Date(o.createdAt).getTime(),
    updated: new Date(o.updatedAt).getTime(),
  }));
  const seatedAt = timestamps.length ? Math.min(...timestamps.map((t) => t.created)) : null;
  const lastOrderAt = timestamps.length ? Math.max(...timestamps.map((t) => t.updated)) : null;

  const covers = orders[0]?.covers ?? table.posti;

  return {
    covers,
    itemCount,
    total,
    servedCourses,
    kitchenCourses,
    seatedAt,
    lastOrderAt,
    notes: orders.map((o) => o.notes.trim()).filter(Boolean).join(" · "),
    waiter: orders[0]?.waiter ?? "",
  };
}

export function formatElapsed(fromMs: number | null, now = Date.now()): string {
  if (fromMs == null) return "—";
  const diff = Math.max(0, now - fromMs);
  const totalMin = Math.floor(diff / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `00:${String(m).padStart(2, "0")}`;
}

export function tableStatusLabel(stato: SalaTable["stato"]): string {
  switch (stato) {
    case "libero":
      return "Libero";
    case "aperto":
      return "Aperto";
    case "conto":
      return "Conto";
    case "sporco":
      return "Sporco";
    default:
      return stato;
  }
}
