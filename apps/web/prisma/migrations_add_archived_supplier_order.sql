-- Archivio documenti ordini fornitore (registro interno, collegato a PurchaseOrder)

CREATE TYPE "ArchivedSupplierOrderKind" AS ENUM ('bozza_confermata', 'ordine_confermato');

CREATE TABLE "ArchivedSupplierOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "poStatus" "PurchaseOrderStatus" NOT NULL,
    "kind" "ArchivedSupplierOrderKind" NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "orderedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArchivedSupplierOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArchivedSupplierOrder_purchaseOrderId_key" ON "ArchivedSupplierOrder"("purchaseOrderId");

CREATE INDEX "ArchivedSupplierOrder_tenantId_archivedAt_idx" ON "ArchivedSupplierOrder"("tenantId", "archivedAt");

ALTER TABLE "ArchivedSupplierOrder" ADD CONSTRAINT "ArchivedSupplierOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArchivedSupplierOrder" ADD CONSTRAINT "ArchivedSupplierOrder_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
