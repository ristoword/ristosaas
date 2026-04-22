import { prisma } from "@/lib/db/prisma";
import type { PurchaseOrderStatus } from "@/lib/db/repositories/purchase-orders.repository";

export type ArchivedSupplierOrderKind = "bozza_confermata" | "ordine_confermato";

export type ArchivedSupplierOrderDto = {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  code: string;
  supplierId: string;
  supplierName: string;
  poStatus: PurchaseOrderStatus;
  kind: ArchivedSupplierOrderKind;
  total: number;
  orderedAt: string | null;
  notes: string;
  archivedAt: string;
};

function mapRow(row: {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  code: string;
  supplierId: string;
  supplierName: string;
  poStatus: PurchaseOrderStatus;
  kind: ArchivedSupplierOrderKind;
  total: { toNumber: () => number };
  orderedAt: Date | null;
  notes: string;
  archivedAt: Date;
}): ArchivedSupplierOrderDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    purchaseOrderId: row.purchaseOrderId,
    code: row.code,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    poStatus: row.poStatus,
    kind: row.kind,
    total: row.total.toNumber(),
    orderedAt: row.orderedAt ? row.orderedAt.toISOString() : null,
    notes: row.notes,
    archivedAt: row.archivedAt.toISOString(),
  };
}

export const archivedSupplierOrdersRepository = {
  async list(tenantId: string): Promise<ArchivedSupplierOrderDto[]> {
    const rows = await prisma.archivedSupplierOrder.findMany({
      where: { tenantId },
      orderBy: { archivedAt: "desc" },
    });
    return rows.map(mapRow);
  },

  /**
   * Archivia un ordine fornitore. `kind` deve essere coerente con lo stato attuale dell'ordine.
   */
  async createFromPurchaseOrder(
    tenantId: string,
    purchaseOrderId: string,
    kind: ArchivedSupplierOrderKind,
  ): Promise<ArchivedSupplierOrderDto> {
    const existing = await prisma.archivedSupplierOrder.findUnique({
      where: { purchaseOrderId },
    });
    if (existing) {
      throw new Error("Questo ordine è già stato archiviato.");
    }

    const po = await prisma.purchaseOrder.findFirst({
      where: { tenantId, id: purchaseOrderId },
      include: { supplier: { select: { name: true } } },
    });
    if (!po) throw new Error("Ordine non trovato.");

    const status = po.status as PurchaseOrderStatus;
    if (status === "annullato") {
      throw new Error("Non è possibile archiviare un ordine annullato.");
    }

    if (kind === "bozza_confermata") {
      if (status !== "bozza") {
        throw new Error("Archiviazione come bozza consentita solo se l'ordine è ancora in bozza.");
      }
    } else {
      if (status === "bozza") {
        throw new Error("Per archiviare come ordine emesso, imposta prima lo stato su Inviato oppure usa Archivia come bozza.");
      }
    }

    const row = await prisma.archivedSupplierOrder.create({
      data: {
        tenantId,
        purchaseOrderId: po.id,
        code: po.code,
        supplierId: po.supplierId,
        supplierName: po.supplier.name,
        poStatus: po.status,
        kind,
        total: po.total,
        orderedAt: po.orderedAt,
        notes: po.notes ?? "",
      },
    });
    return mapRow(row);
  },
};
