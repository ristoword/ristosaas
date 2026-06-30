import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseBollaImportRepository } from "@/lib/db/repositories/warehouse-bolla-import.repository";
import { startBollaImportProcessing } from "@/lib/warehouse/bolla-import/service";
import { prisma } from "@/lib/db/prisma";

const ROLES = ["magazzino", "supervisor", "owner", "super_admin"] as const;

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;
  const tenantId = getTenantId();
  const dashboard = await warehouseBollaImportRepository.getDashboard(tenantId);
  return ok(dashboard);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...ROLES]);
  if (guard.error) return guard.error;

  let parsed: {
    supplierId?: string;
    supplierName?: string;
    fileName?: string;
    mimeType?: string;
    contentBase64?: string;
  };
  try {
    parsed = await body(req);
  } catch {
    return err("Invalid JSON", 400);
  }

  const { supplierId, supplierName, fileName, mimeType, contentBase64 } = parsed;
  if (!contentBase64?.trim()) return err("contentBase64 richiesto", 400);
  if (!mimeType?.trim()) return err("mimeType richiesto", 400);

  const tenantId = guard.user.tenantId || getTenantId();
  let resolvedSupplierName = supplierName?.trim() ?? "";

  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { name: true },
    });
    if (!supplier) return err("Fornitore non trovato", 404);
    resolvedSupplierName = supplier.name;
  }

  if (!resolvedSupplierName) return err("Seleziona un fornitore", 400);

  const allowed =
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType === "application/octet-stream";
  if (!allowed) return err("Formato non supportato. Usa PDF, JPG o PNG.", 400);

  const importId = await warehouseBollaImportRepository.createImport({
    tenantId,
    supplierId: supplierId ?? null,
    supplierName: resolvedSupplierName,
    documentMime: mimeType,
    documentBase64: contentBase64.replace(/^data:[^;]+;base64,/, ""),
    documentFileName: fileName ?? "bolla.pdf",
    userId: guard.user.id,
    userName: guard.user.name,
  });

  startBollaImportProcessing(
    tenantId,
    importId,
    resolvedSupplierName,
    contentBase64.replace(/^data:[^;]+;base64,/, ""),
    mimeType,
  );

  const record = await warehouseBollaImportRepository.getById(tenantId, importId);
  return ok({ importId, import: record });
}
