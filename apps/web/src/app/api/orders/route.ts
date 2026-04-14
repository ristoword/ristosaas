import { NextRequest } from "next/server";
import type { Order, OrderItem } from "@/lib/api/types/orders";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { ordersRepository } from "@/lib/db/repositories/orders.repository";

const ORDER_ROLES = ["sala", "cassa", "cucina", "bar", "pizzeria", "supervisor"] as const;

/** GET /api/orders?status=in_attesa&area=cucina&table=5 */
export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const { searchParams } = req.nextUrl;
  const results = await ordersRepository.all(getTenantId(), {
    status: searchParams.get("status"),
    area: searchParams.get("area"),
    table: searchParams.get("table"),
    active: searchParams.get("active"),
  });
  return ok(results);
}

/** POST /api/orders — create order */
export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...ORDER_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status">>(req);
  if (!data.items?.length) return err("items are required");

  const courseStates = buildCourseStates(data.items);
  const nums = [...new Set(data.items.map((i: OrderItem) => i.course))].sort((a, b) => a - b);

  const orderPayload: Omit<Order, "id" | "createdAt" | "updatedAt"> = {
    ...data,
    activeCourse: nums[0] ?? 1,
    courseStates,
    status: "in_attesa",
  };
  const order = await ordersRepository.create(getTenantId(), orderPayload);
  return ok(order, 201);
}

function buildCourseStates(items: OrderItem[]): Record<string, "queued" | "in_attesa" | "in_preparazione" | "pronto" | "servito"> {
  const courseNums = [...new Set(items.map((item) => item.course))].sort((a, b) => a - b);
  const states: Record<string, "queued" | "in_attesa" | "in_preparazione" | "pronto" | "servito"> = {};
  for (let idx = 0; idx < courseNums.length; idx += 1) {
    const course = courseNums[idx];
    states[String(course)] = idx === 0 ? "in_attesa" : "queued";
  }
  return states;
}
