-- Optimize Sala → Cucina order flow queries

-- Index for fast lookup of active orders by status (KDS)
CREATE INDEX IF NOT EXISTS "RestaurantOrder_tenantId_status_idx"
  ON "RestaurantOrder"("tenantId", "status");

-- Index for area + status filtering (kitchen/bar/pizzeria screens)
CREATE INDEX IF NOT EXISTS "RestaurantOrder_tenantId_area_status_idx"
  ON "RestaurantOrder"("tenantId", "area", "status");

-- Index for detecting recently changed orders (WebSocket fallback)
CREATE INDEX IF NOT EXISTS "RestaurantOrder_tenantId_updatedAt_idx"
  ON "RestaurantOrder"("tenantId", "updatedAt");

-- Index for item lookup by course (course progression logic)
CREATE INDEX IF NOT EXISTS "RestaurantOrderItem_orderId_course_idx"
  ON "RestaurantOrderItem"("orderId", "course");
