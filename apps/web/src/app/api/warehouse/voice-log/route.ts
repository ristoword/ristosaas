import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseVoiceRepository } from "@/lib/db/repositories/warehouse-voice.repository";

const MAX_LEN = 4000;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  const take = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 50));
  return ok(await warehouseVoiceRepository.list(getTenantId(), take));
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  const data = await body<{ transcript?: unknown }>(req);
  const transcript =
    typeof data.transcript === "string" ? data.transcript.trim().slice(0, MAX_LEN) : "";
  if (!transcript) return err("Trascrizione vuota.", 400);
  const row = await warehouseVoiceRepository.append(getTenantId(), transcript);
  return ok(row, 201);
}
