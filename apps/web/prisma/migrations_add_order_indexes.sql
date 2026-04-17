-- Improves query performance for tenant-scoped order listing.
CREATE INDEX IF NOT EXISTS "RestaurantOrder_tenantId_createdAt_idx"
  ON "RestaurantOrder" ("tenantId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "RestaurantOrder_tenantId_status_createdAt_idx"
  ON "RestaurantOrder" ("tenantId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "RestaurantOrder_tenantId_table_createdAt_idx"
  ON "RestaurantOrder" ("tenantId", "table", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "RestaurantOrderItem_orderId_area_idx"
  ON "RestaurantOrderItem" ("orderId", "area");
