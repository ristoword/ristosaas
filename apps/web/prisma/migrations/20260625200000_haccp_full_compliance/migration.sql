-- Add new HACCP entry types for full Italian law compliance (D.Lgs. 193/2007)
ALTER TYPE "HaccpEntryType" ADD VALUE IF NOT EXISTS 'pulizia_manutenzione';
ALTER TYPE "HaccpEntryType" ADD VALUE IF NOT EXISTS 'disinfestazione';
ALTER TYPE "HaccpEntryType" ADD VALUE IF NOT EXISTS 'non_conformita';
ALTER TYPE "HaccpEntryType" ADD VALUE IF NOT EXISTS 'formazione_personale';
ALTER TYPE "HaccpEntryType" ADD VALUE IF NOT EXISTS 'olio_frittura';
ALTER TYPE "HaccpEntryType" ADD VALUE IF NOT EXISTS 'allergeni';
ALTER TYPE "HaccpEntryType" ADD VALUE IF NOT EXISTS 'acqua_potabile';
ALTER TYPE "HaccpEntryType" ADD VALUE IF NOT EXISTS 'rifiuti';

-- Add new fields for comprehensive HACCP documentation
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "thresholdMin" DECIMAL(5,2);
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "thresholdMax" DECIMAL(5,2);
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "conforme" BOOLEAN;
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "correctiveAction" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "supplier" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "product" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "lotNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "cleaningProduct" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "dilution" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HaccpEntry" ADD COLUMN IF NOT EXISTS "contactTime" TEXT NOT NULL DEFAULT '';
