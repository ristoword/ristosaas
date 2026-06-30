import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseBollaImportRepository } from "@/lib/db/repositories/warehouse-bolla-import.repository";
import { processBollaImportAsync } from "@/lib/warehouse/bolla-import/service";
import { BOLLA_IMPORT_ROLES } from "@/lib/warehouse/bolla-import/permissions";
import { prisma } from "@/lib/db/prisma";

export const maxDuration = 120;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser(req, [...BOLLA_IMPORT_ROLES]);
  if (guard.error) return guard.error;

  const { id } = await context.params;
  const tenantId = guard.user.tenantId || getTenantId();

  const imp = await prisma.warehouseBollaImport.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      status: true,
      supplierName: true,
      documentBase64: true,
      documentMime: true,
      defaultWarehouseLocation: true,
    },
  });

  if (!imp) return err("Importazione non trovata", 404);
  if (imp.status === "review" || imp.status === "completed") {
    const record = await warehouseBollaImportRepository.getById(tenantId, id);
    return ok({ import: record });
  }
  if (!imp.documentBase64?.trim()) return err("Documento non disponibile", 400);

  const mime = imp.documentMime ?? "image/jpeg";
  if (mime === "application/pdf" || mime.includes("pdf")) {
    return err(
      "I PDF non sono supportati per l'OCR. Scatta una foto o esporta la bolla come JPG/PNG.",
      400,
    );
  }

  await processBollaImportAsync(
    tenantId,
    id,
    imp.supplierName,
    imp.documentBase64,
    mime,
    imp.defaultWarehouseLocation ?? "MAGAZZINO_CENTRALE",
  );

  const record = await warehouseBollaImportRepository.getById(tenantId, id);
  return ok({ import: record });
}
