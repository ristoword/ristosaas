DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiProposalType') THEN
    CREATE TYPE "AiProposalType" AS ENUM (
      'food_cost',
      'warehouse',
      'menu',
      'pricing',
      'manager_report',
      'reorder',
      'hotel_bridge'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiProposalStatus') THEN
    CREATE TYPE "AiProposalStatus" AS ENUM (
      'draft',
      'pending_review',
      'approved',
      'rejected',
      'applied',
      'cancelled'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "AiProposal" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "type" "AiProposalType" NOT NULL,
  "status" "AiProposalStatus" NOT NULL DEFAULT 'draft',
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiProposal_tenantId_status_type_createdAt_idx"
  ON "AiProposal"("tenantId", "status", "type", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiProposal_tenantId_fkey'
  ) THEN
    ALTER TABLE "AiProposal"
      ADD CONSTRAINT "AiProposal_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "WarehouseLot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "warehouseItemId" TEXT NOT NULL,
  "lotCode" TEXT NOT NULL,
  "qty" DECIMAL(12,3) NOT NULL,
  "qtyRemaining" DECIMAL(12,3) NOT NULL,
  "purchaseUnitCost" DECIMAL(12,4) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseLot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseLot_tenantId_warehouseItemId_lotCode_key"
  ON "WarehouseLot"("tenantId", "warehouseItemId", "lotCode");
CREATE INDEX IF NOT EXISTS "WarehouseLot_tenantId_expiresAt_idx"
  ON "WarehouseLot"("tenantId", "expiresAt");
CREATE INDEX IF NOT EXISTS "WarehouseLot_tenantId_warehouseItemId_receivedAt_idx"
  ON "WarehouseLot"("tenantId", "warehouseItemId", "receivedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WarehouseLot_tenantId_fkey'
  ) THEN
    ALTER TABLE "WarehouseLot"
      ADD CONSTRAINT "WarehouseLot_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WarehouseLot_warehouseItemId_fkey'
  ) THEN
    ALTER TABLE "WarehouseLot"
      ADD CONSTRAINT "WarehouseLot_warehouseItemId_fkey"
      FOREIGN KEY ("warehouseItemId") REFERENCES "WarehouseItem"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "WarehouseCostHistory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "warehouseItemId" TEXT NOT NULL,
  "unitCost" DECIMAL(12,4) NOT NULL,
  "source" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseCostHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WarehouseCostHistory_tenantId_warehouseItemId_effectiveAt_idx"
  ON "WarehouseCostHistory"("tenantId", "warehouseItemId", "effectiveAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WarehouseCostHistory_tenantId_fkey'
  ) THEN
    ALTER TABLE "WarehouseCostHistory"
      ADD CONSTRAINT "WarehouseCostHistory_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WarehouseCostHistory_warehouseItemId_fkey'
  ) THEN
    ALTER TABLE "WarehouseCostHistory"
      ADD CONSTRAINT "WarehouseCostHistory_warehouseItemId_fkey"
      FOREIGN KEY ("warehouseItemId") REFERENCES "WarehouseItem"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'RecipeIngredient' AND column_name = 'warehouseItemId'
  ) THEN
    ALTER TABLE "RecipeIngredient" ADD COLUMN "warehouseItemId" TEXT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RecipeIngredient_warehouseItemId_fkey'
  ) THEN
    ALTER TABLE "RecipeIngredient"
      ADD CONSTRAINT "RecipeIngredient_warehouseItemId_fkey"
      FOREIGN KEY ("warehouseItemId") REFERENCES "WarehouseItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "RecipeIngredient_warehouseItemId_idx"
  ON "RecipeIngredient"("warehouseItemId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'RestaurantOrderItem' AND column_name = 'menuItemId'
  ) THEN
    ALTER TABLE "RestaurantOrderItem" ADD COLUMN "menuItemId" TEXT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RestaurantOrderItem_menuItemId_fkey'
  ) THEN
    ALTER TABLE "RestaurantOrderItem"
      ADD CONSTRAINT "RestaurantOrderItem_menuItemId_fkey"
      FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "RestaurantOrderItem_menuItemId_idx"
  ON "RestaurantOrderItem"("menuItemId");
