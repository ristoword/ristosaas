import { db } from "@/lib/api/store";
import { ok } from "@/lib/api/helpers";

/** GET /api/rooms — list all rooms */
export async function GET() {
  return ok(db.rooms.all());
}
