import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import {
  archivioFiscalStubRepository,
  type ArchivioFiscalStubKind,
} from "@/lib/db/repositories/archivio-fiscal-stub.repository";

function parseKind(raw: string | null): ArchivioFiscalStubKind | null {
  if (raw === "entrata" || raw === "cassa") return raw;
  return null;
}

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  const kind = parseKind(new URL(req.url).searchParams.get("kind"));
  if (!kind) return err('Parametro "kind" richiesto: entrata o cassa.', 400);
  return ok(await archivioFiscalStubRepository.list(getTenantId(), kind));
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  if (guard.user?.role === "super_admin") {
    return err("Operazione disponibile solo nel contesto tenant.", 400);
  }
  const data = await body<{
    kind?: unknown;
    reference?: unknown;
    counterparty?: unknown;
    issueDate?: unknown;
    amount?: unknown;
    vatRateNote?: unknown;
    notes?: unknown;
  }>(req);
  const kind = typeof data.kind === "string" ? parseKind(data.kind) : null;
  if (!kind) return err('Campo "kind" deve essere entrata o cassa.', 400);
  const amount = typeof data.amount === "number" ? data.amount : Number(data.amount);
  if (!Number.isFinite(amount) || amount < 0) return err("Importo non valido.", 400);
  const row = await archivioFiscalStubRepository.create(getTenantId(), kind, {
    reference: typeof data.reference === "string" ? data.reference : "",
    counterparty: typeof data.counterparty === "string" ? data.counterparty : "",
    issueDate: typeof data.issueDate === "string" ? data.issueDate : undefined,
    amount,
    vatRateNote: typeof data.vatRateNote === "string" ? data.vatRateNote : "",
    notes: typeof data.notes === "string" ? data.notes : "",
  });
  return ok(row, 201);
}
