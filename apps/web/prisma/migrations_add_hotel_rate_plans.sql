-- Add hotel rate plans as persistent DB entity.
CREATE TABLE IF NOT EXISTS "HotelRatePlan" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "roomType" TEXT NOT NULL,
  "boardType" "BoardType" NOT NULL,
  "nightlyRate" DECIMAL(10,2) NOT NULL,
  "refundable" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "HotelRatePlan_tenantId_code_key"
  ON "HotelRatePlan"("tenantId", "code");

CREATE INDEX IF NOT EXISTS "HotelRatePlan_tenantId_roomType_active_idx"
  ON "HotelRatePlan"("tenantId", "roomType", "active");

DO $$ BEGIN
  ALTER TABLE "HotelRatePlan"
    ADD CONSTRAINT "HotelRatePlan_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
