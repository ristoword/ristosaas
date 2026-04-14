-- Persist clock-in / clock-out events for staff.

CREATE TABLE IF NOT EXISTS "StaffShift" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "clockInAt" TIMESTAMP(3) NOT NULL,
  "clockOutAt" TIMESTAMP(3),
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "StaffShift_tenantId_staffId_clockInAt_idx"
  ON "StaffShift"("tenantId", "staffId", "clockInAt");

DO $$ BEGIN
  ALTER TABLE "StaffShift"
  ADD CONSTRAINT "StaffShift_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "StaffShift"
  ADD CONSTRAINT "StaffShift_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
