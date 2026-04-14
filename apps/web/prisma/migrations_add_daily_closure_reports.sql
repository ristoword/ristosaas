-- Persisted daily closure reports for cassa/supervisor analytics.
CREATE TABLE IF NOT EXISTS "DailyClosureReport" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "foodSpend" DECIMAL(10,2) NOT NULL,
  "staffSpend" DECIMAL(10,2) NOT NULL,
  "revenue" DECIMAL(10,2) NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyClosureReport_tenantId_date_key"
  ON "DailyClosureReport"("tenantId", "date");

CREATE INDEX IF NOT EXISTS "DailyClosureReport_tenantId_date_idx"
  ON "DailyClosureReport"("tenantId", "date");

DO $$ BEGIN
  ALTER TABLE "DailyClosureReport"
    ADD CONSTRAINT "DailyClosureReport_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
