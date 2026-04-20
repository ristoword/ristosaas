-- PurchaseOrder + PurchaseOrderItem (fornitori -> ordine -> ricezione magazzino).
-- Idempotente.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PurchaseOrderStatus') THEN
    CREATE TYPE "PurchaseOrderStatus" AS ENUM ('bozza', 'inviato', 'parziale', 'ricevuto', 'annullato');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id"          TEXT PRIMARY KEY,
  "tenantId"    TEXT NOT NULL,
  "supplierId"  TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "status"      "PurchaseOrderStatus" NOT NULL DEFAULT 'bozza',
  "notes"       TEXT NOT NULL DEFAULT '',
  "orderedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedAt"  TIMESTAMP(3),
  "receivedAt"  TIMESTAMP(3),
  "total"       DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrder_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "PurchaseOrder_supplier_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_code_key"
  ON "PurchaseOrder" ("tenantId", "code");

CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_status_idx"
  ON "PurchaseOrder" ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_supplierId_idx"
  ON "PurchaseOrder" ("tenantId", "supplierId");

CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  "id"              TEXT PRIMARY KEY,
  "tenantId"        TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "warehouseItemId" TEXT NOT NULL,
  "qtyOrdered"      DECIMAL(12,3) NOT NULL,
  "qtyReceived"     DECIMAL(12,3) NOT NULL DEFAULT 0,
  "unit"            TEXT NOT NULL,
  "unitCost"        DECIMAL(12,4) NOT NULL,
  "notes"           TEXT NOT NULL DEFAULT '',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrderItem_tenant_fkey"  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "PurchaseOrderItem_order_fkey"   FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
  CONSTRAINT "PurchaseOrderItem_item_fkey"    FOREIGN KEY ("warehouseItemId") REFERENCES "WarehouseItem"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_tenantId_purchaseOrderId_idx"
  ON "PurchaseOrderItem" ("tenantId", "purchaseOrderId");

CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_tenantId_warehouseItemId_idx"
  ON "PurchaseOrderItem" ("tenantId", "warehouseItemId");

