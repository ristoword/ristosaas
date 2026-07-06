-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WarehouseBollaImportStatus" AS ENUM ('queued', 'analyzing', 'ocr', 'matching', 'review', 'importing', 'completed', 'failed', 'undone');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "WarehouseMovement" ADD COLUMN IF NOT EXISTS "bollaImportId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "WarehouseBollaImport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "documentNumber" TEXT,
    "documentDate" TIMESTAMP(3),
    "bollaNumber" TEXT,
    "invoiceNumber" TEXT,
    "vatAmount" DECIMAL(12,2),
    "totalAmount" DECIMAL(12,2),
    "status" "WarehouseBollaImportStatus" NOT NULL DEFAULT 'queued',
    "currentStep" TEXT NOT NULL DEFAULT 'queued',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "documentMime" TEXT,
    "documentBase64" TEXT,
    "documentFileName" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3),
    "undoneAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseBollaImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WarehouseBollaImportLine" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lineOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,4),
    "vatPct" DECIMAL(5,2),
    "discountPct" DECIMAL(5,2),
    "lineTotal" DECIMAL(12,2),
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "suggestedCategory" TEXT NOT NULL,
    "selectedCategory" TEXT NOT NULL,
    "warehouseLocation" TEXT NOT NULL DEFAULT 'MAGAZZINO_CENTRALE',
    "warehouseItemId" TEXT,
    "matchStatus" TEXT NOT NULL DEFAULT 'new',
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "imported" BOOLEAN NOT NULL DEFAULT false,
    "movementId" TEXT,
    "createdItemId" TEXT,
    "prevQty" DECIMAL(12,3),
    "prevCost" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseBollaImportLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WarehouseBollaImportAuditLog" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseBollaImportAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WarehouseCategoryLearning" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseCategoryLearning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WarehouseMovement_tenantId_bollaImportId_idx" ON "WarehouseMovement"("tenantId", "bollaImportId");
CREATE INDEX IF NOT EXISTS "WarehouseBollaImport_tenantId_createdAt_idx" ON "WarehouseBollaImport"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "WarehouseBollaImport_tenantId_status_idx" ON "WarehouseBollaImport"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "WarehouseBollaImportLine_tenantId_importId_idx" ON "WarehouseBollaImportLine"("tenantId", "importId");
CREATE INDEX IF NOT EXISTS "WarehouseBollaImportLine_importId_lineOrder_idx" ON "WarehouseBollaImportLine"("importId", "lineOrder");
CREATE INDEX IF NOT EXISTS "WarehouseBollaImportAuditLog_tenantId_importId_createdAt_idx" ON "WarehouseBollaImportAuditLog"("tenantId", "importId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseCategoryLearning_tenantId_productKey_key" ON "WarehouseCategoryLearning"("tenantId", "productKey");
CREATE INDEX IF NOT EXISTS "WarehouseCategoryLearning_tenantId_category_idx" ON "WarehouseCategoryLearning"("tenantId", "category");

-- AddForeignKey (idempotent: drop if exists then recreate)
ALTER TABLE "WarehouseMovement" DROP CONSTRAINT IF EXISTS "WarehouseMovement_bollaImportId_fkey";
ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_bollaImportId_fkey" FOREIGN KEY ("bollaImportId") REFERENCES "WarehouseBollaImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WarehouseBollaImport" DROP CONSTRAINT IF EXISTS "WarehouseBollaImport_tenantId_fkey";
ALTER TABLE "WarehouseBollaImport" ADD CONSTRAINT "WarehouseBollaImport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WarehouseBollaImport" DROP CONSTRAINT IF EXISTS "WarehouseBollaImport_supplierId_fkey";
ALTER TABLE "WarehouseBollaImport" ADD CONSTRAINT "WarehouseBollaImport_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WarehouseBollaImportLine" DROP CONSTRAINT IF EXISTS "WarehouseBollaImportLine_importId_fkey";
ALTER TABLE "WarehouseBollaImportLine" ADD CONSTRAINT "WarehouseBollaImportLine_importId_fkey" FOREIGN KEY ("importId") REFERENCES "WarehouseBollaImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WarehouseBollaImportAuditLog" DROP CONSTRAINT IF EXISTS "WarehouseBollaImportAuditLog_importId_fkey";
ALTER TABLE "WarehouseBollaImportAuditLog" ADD CONSTRAINT "WarehouseBollaImportAuditLog_importId_fkey" FOREIGN KEY ("importId") REFERENCES "WarehouseBollaImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WarehouseCategoryLearning" DROP CONSTRAINT IF EXISTS "WarehouseCategoryLearning_tenantId_fkey";
ALTER TABLE "WarehouseCategoryLearning" ADD CONSTRAINT "WarehouseCategoryLearning_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
