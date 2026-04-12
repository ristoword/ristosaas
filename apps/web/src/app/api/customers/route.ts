import { NextRequest } from "next/server";
import { uid } from "@/lib/api/store";
import { customersCollection } from "@/lib/api/store-ext";
import { ok, err, body } from "@/lib/api/helpers";

export async function GET() { return ok(customersCollection.all()); }
export async function POST(req: NextRequest) {
  const data = await body<any>(req);
  if (!data.name?.trim()) return err("name required");
  const id = uid("cst");
  const item = { ...data, id };
  customersCollection.set(id, item);
  return ok(item, 201);
}
