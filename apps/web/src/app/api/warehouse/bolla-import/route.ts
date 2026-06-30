import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseBollaImportRepository } from "@/lib/db/repositories/warehouse-bolla-import.repository";
import { BOLLA_IMPORT_ROLES } from "@/lib/warehouse/bolla-import/permissions";
import { WAREHOUSE_LOCATIONS } from "@/lib/api/types/warehouse";
import { prisma } from "@/lib/db/prisma";

const ROLES = BOLLA_IMPORT_ROLES;

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
    defaultWarehouseLocation?: string;
  };
  try {
    parsed = await body(req);
  } catch {
    return err("Invalid JSON", 400);
  }

  const { supplierId, supplierName, fileName, mimeType, contentBase64, defaultWarehouseLocation } = parsed;
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

  const isPdf = mimeType === "application/pdf" || mimeType.includes("pdf");
  const allowed =
    mimeType.startsWith("image/") ||
    isPdf ||
    mimeType === "application/octet-stream";
  if (!allowed) return err("Formato non supportato. Usa JPG o PNG (foto/scansione della bolla).", 400);

  const targetLocation =
    defaultWarehouseLocation &&
    (WAREHOUSE_LOCATIONS as string[]).includes(defaultWarehouseLocation)
      ? defaultWarehouseLocation
      : "MAGAZZINO_CENTRALE";

  const importId = await warehouseBollaImportRepository.createImport({
    tenantId,
    supplierId: supplierId ?? null,
    supplierName: resolvedSupplierName,
    documentMime: mimeType,
    documentBase64: contentBase64.replace(/^data:[^;]+;base64,/, ""),
    documentFileName: fileName ?? (isPdf ? "bolla.pdf" : "bolla.jpg"),
    defaultWarehouseLocation: targetLocation,
    userId: guard.user.id,
    userName: guard.user.name,
  });

  const record = await warehouseBollaImportRepository.getById(tenantId, importId);
  return ok({ importId, import: record });
}
