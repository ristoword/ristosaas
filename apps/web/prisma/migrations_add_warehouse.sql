-- Safe additive migration for warehouse persistence.
-- No destructive statements.

DO $$ BEGIN
  CREATE TYPE "WarehouseMovementType" AS ENUM ('carico', 'scarico', 'scarico_comanda');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "WarehouseItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "qty" DECIMAL(12,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "minStock" DECIMAL(12,3) NOT NULL,
  "costPerUnit" DECIMAL(12,4) NOT NULL,
  "supplier" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseItem_tenantId_name_key"
  ON "WarehouseItem"("tenantId", "name");

DO $$ BEGIN
  ALTER TABLE "WarehouseItem"
    ADD CONSTRAINT "WarehouseItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "WarehouseMovement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "warehouseItemId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "type" "WarehouseMovementType" NOT NULL,
  "qty" DECIMAL(12,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WarehouseMovement_tenantId_date_idx"
  ON "WarehouseMovement"("tenantId", "date");

DO $$ BEGIN
  ALTER TABLE "WarehouseMovement"
    ADD CONSTRAINT "WarehouseMovement_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "WarehouseMovement"
    ADD CONSTRAINT "WarehouseMovement_warehouseItemId_fkey"
    FOREIGN KEY ("warehouseItemId") REFERENCES "WarehouseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
