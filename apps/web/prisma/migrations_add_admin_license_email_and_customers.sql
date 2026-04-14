-- Add customer enrichment + tenant license/email config for superadmin operations.

DO $$ BEGIN
  CREATE TYPE "CustomerType" AS ENUM ('vip', 'habitue', 'walk_in', 'new');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LicenseStatus" AS ENUM ('trial', 'active', 'expired', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "type" "CustomerType" NOT NULL DEFAULT 'new';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "visits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "avgSpend" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastVisit" TIMESTAMP(3) NULL;

CREATE TABLE IF NOT EXISTS "TenantLicense" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL UNIQUE,
  "licenseKey" TEXT NOT NULL UNIQUE,
  "status" "LicenseStatus" NOT NULL DEFAULT 'active',
  "plan" "ProductPlan" NOT NULL,
  "billingCycle" TEXT NOT NULL,
  "seats" INTEGER NOT NULL,
  "usedSeats" INTEGER NOT NULL,
  "activatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TenantEmailConfig" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL UNIQUE,
  "host" TEXT NOT NULL,
  "port" INTEGER NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "fromAddress" TEXT NOT NULL,
  "secure" BOOLEAN NOT NULL DEFAULT false,
  "lastTestStatus" TEXT NULL,
  "lastTestedAt" TIMESTAMP(3) NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE "TenantLicense"
    ADD CONSTRAINT "TenantLicense_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TenantEmailConfig"
    ADD CONSTRAINT "TenantEmailConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
