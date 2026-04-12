import { NextRequest } from "next/server";
import { uid } from "@/lib/api/store";
import { bookingsCollection } from "@/lib/api/store-ext";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";

const BOOKING_ROLES = ["sala", "cassa", "supervisor"] as const;

export async function GET(req: NextRequest) {
  const guard = requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  return ok(bookingsCollection.all());
}
export async function POST(req: NextRequest) {
  const guard = requireApiUser(req, [...BOOKING_ROLES]);
  if (guard.error) return guard.error;
  const data = await body<any>(req);
  if (!data.customerName?.trim()) return err("customerName required");
  const id = uid("bk");
  const item = { ...data, id };
  bookingsCollection.set(id, item);
  return ok(item, 201);
}
