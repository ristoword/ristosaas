-- Add sourceOrderId to ArchivedOrder (idempotent).
-- Allows linking an archived record back to the original RestaurantOrder
-- and prevents double-archiving on webhook retries / duplicate POSTs.

ALTER TABLE "ArchivedOrder"
  ADD COLUMN IF NOT EXISTS "sourceOrderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ArchivedOrder_sourceOrderId_key"
  ON "ArchivedOrder" ("sourceOrderId");

CREATE INDEX IF NOT EXISTS "ArchivedOrder_tenantId_closedAt_idx"
  ON "ArchivedOrder" ("tenantId", "closedAt");
