import { NextRequest } from "next/server";
import { uid } from "@/lib/api/store";
import { archivioCollection } from "@/lib/api/store-ext";
import { ok, err, body } from "@/lib/api/helpers";

export async function GET() { return ok(archivioCollection.all()); }
export async function POST(req: NextRequest) {
  const data = await body<any>(req);
  const id = uid("arc");
  const item = { ...data, id };
  archivioCollection.set(id, item);
  return ok(item, 201);
}
