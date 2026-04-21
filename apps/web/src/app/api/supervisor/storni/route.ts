import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { supervisorStorniRepository } from "@/lib/db/repositories/supervisor-storni.repository";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  return ok(await supervisorStorniRepository.list(getTenantId()));
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  const data = await body<{
    amount?: unknown;
    motivo?: unknown;
    tavolo?: unknown;
    ordineId?: unknown;
    note?: unknown;
  }>(req);
  const amount = typeof data.amount === "number" ? data.amount : Number(data.amount);
  const motivo = typeof data.motivo === "string" ? data.motivo.trim() : "";
  if (!Number.isFinite(amount) || amount <= 0) return err("Importo non valido.", 400);
  if (!motivo) return err("Motivo obbligatorio.", 400);
  const row = await supervisorStorniRepository.create(getTenantId(), {
    amount,
    motivo,
    tavolo: typeof data.tavolo === "string" ? data.tavolo : "",
    ordineId: typeof data.ordineId === "string" ? data.ordineId : "",
    note: typeof data.note === "string" ? data.note : "",
  });
  return ok(row, 201);
}
