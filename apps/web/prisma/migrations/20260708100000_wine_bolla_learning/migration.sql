-- Memorizza alias vini appresi dalle bolle cantina (testo OCR → vino in carta)
CREATE TABLE IF NOT EXISTS "WineImportAlias" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productKey" TEXT NOT NULL,
    "wineCellarItemId" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WineImportAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WineImportAlias_tenantId_productKey_key" ON "WineImportAlias"("tenantId", "productKey");
CREATE INDEX IF NOT EXISTS "WineImportAlias_tenantId_wineCellarItemId_idx" ON "WineImportAlias"("tenantId", "wineCellarItemId");

ALTER TABLE "WineImportAlias" DROP CONSTRAINT IF EXISTS "WineImportAlias_tenantId_fkey";
ALTER TABLE "WineImportAlias" ADD CONSTRAINT "WineImportAlias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
