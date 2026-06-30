-- Bolla import: persist default location + cantina wine sync tracking
ALTER TABLE "WarehouseBollaImport" ADD COLUMN IF NOT EXISTS "defaultWarehouseLocation" TEXT NOT NULL DEFAULT 'MAGAZZINO_CENTRALE';

ALTER TABLE "WarehouseBollaImportLine" ADD COLUMN IF NOT EXISTS "wineCellarItemId" TEXT;
ALTER TABLE "WarehouseBollaImportLine" ADD COLUMN IF NOT EXISTS "prevWineStock" INTEGER;
ALTER TABLE "WarehouseBollaImportLine" ADD COLUMN IF NOT EXISTS "wineCreated" BOOLEAN NOT NULL DEFAULT false;
