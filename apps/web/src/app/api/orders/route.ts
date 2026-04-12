import { NextRequest } from "next/server";
import { db, uid } from "@/lib/api/store";
import type { Order, OrderItem } from "@/lib/api/types/orders";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const ORDER_ROLES = ["sala", "cassa", "cucina", "bar", "pizzeria", "supervisor"] as const;

/** GET /api/orders?status=in_attesa&area=cucina&table=5 */
export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { searchParams } = req.nextUrl;
  let results = db.orders.all();

  const status = searchParams.get("status");
  if (status) results = results.filter((o) => o.status === status);

  const area = searchParams.get("area");
  if (area) results = results.filter((o) => o.area === area || o.items.some((i) => i.area === area));

  const table = searchParams.get("table");
  if (table) results = results.filter((o) => o.table === table);

  const active = searchParams.get("active");
  if (active === "true") results = results.filter((o) => !["chiuso", "annullato", "servito"].includes(o.status));

  return ok(results);
}

/** POST /api/orders — create order */
export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status">>(req);
  if (!data.items?.length) return err("items are required");

  const id = uid("ord");
  const now = new Date().toISOString();
  const courseStates = db.orders.buildCourseStates(data.items);
  const nums = [...new Set(data.items.map((i: OrderItem) => i.course))].sort((a, b) => a - b);

  const order: Order = {
    ...data,
    id,
    activeCourse: nums[0] ?? 1,
    courseStates,
    status: "in_attesa",
    createdAt: now,
    updatedAt: now,
  };

  db.orders.set(id, order);
  return ok(order, 201);
}
