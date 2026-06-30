import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseBollaImportRepository } from "@/lib/db/repositories/warehouse-bolla-import.repository";
import type { ConfirmBollaLineInput } from "@/lib/warehouse/bolla-import/types";
import { normalizeProductKey } from "@/lib/warehouse/bolla-import/categories";
import { BOLLA_IMPORT_ROLES } from "@/lib/warehouse/bolla-import/permissions";

const ROLES = BOLLA_IMPORT_ROLES;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;
  const { id } = await context.params;
  const tenantId = guard.user.tenantId || getTenantId();

  let parsed: { lines?: ConfirmBollaLineInput[] };
  try {
    parsed = await body(req);
  } catch {
    return err("Invalid JSON", 400);
  }

  const imp = await warehouseBollaImportRepository.getById(tenantId, id);
  if (!imp) return err("Importazione non trovata", 404);
  if (imp.status !== "review" && imp.status !== "failed") {
    return err("Importazione non in revisione", 400);
  }

  if (parsed.lines?.length) {
    await warehouseBollaImportRepository.updateLines(tenantId, id, parsed.lines);
    for (const line of parsed.lines) {
      if (line.selectedCategory && line.description) {
        const key = normalizeProductKey(line.description);
        await warehouseBollaImportRepository.learnCategory(tenantId, key, line.selectedCategory);
      }
    }
  }

  await warehouseBollaImportRepository.updateProgress(tenantId, id, {
    status: "importing",
    currentStep: "Aggiornamento magazzino",
    progressPct: 95,
  });

  try {
    await warehouseBollaImportRepository.executeImport(
      tenantId,
      id,
      imp.supplierName,
      guard.user.id,
      guard.user.name,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore importazione";
    await warehouseBollaImportRepository.updateProgress(tenantId, id, {
      status: "failed",
      currentStep: "Errore importazione",
      errorMessage: message,
    });
    return err(message, 400);
  }

  const updated = await warehouseBollaImportRepository.getById(tenantId, id);
  return ok({ import: updated });
}
