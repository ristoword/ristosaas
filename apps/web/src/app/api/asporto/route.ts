import { NextRequest } from "next/server";
import { uid } from "@/lib/api/store";
import { asportoCollection } from "@/lib/api/store-ext";
import { ok, err, body } from "@/lib/api/helpers";

export async function GET() { return ok(asportoCollection.all()); }
export async function POST(req: NextRequest) {
  const data = await body<any>(req);
  if (!data.customerName?.trim()) return err("customerName required");
  const id = uid("asp");
  const item = { ...data, id };
  asportoCollection.set(id, item);
  return ok(item, 201);
}
