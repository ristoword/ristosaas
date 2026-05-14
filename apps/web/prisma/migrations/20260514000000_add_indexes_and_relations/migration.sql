-- Add missing indexes for query performance on tenant-scoped tables

-- HousekeepingTask: frequently listed by tenant with status/date filters
CREATE INDEX IF NOT EXISTS "HousekeepingTask_tenantId_scheduledFor_idx" ON "HousekeepingTask"("tenantId", "scheduledFor");
CREATE INDEX IF NOT EXISTS "HousekeepingTask_tenantId_status_idx" ON "HousekeepingTask"("tenantId", "status");

-- GuestFolio: listed by tenant, filtered by status
CREATE INDEX IF NOT EXISTS "GuestFolio_tenantId_idx" ON "GuestFolio"("tenantId");
CREATE INDEX IF NOT EXISTS "GuestFolio_tenantId_status_idx" ON "GuestFolio"("tenantId", "status");

-- FolioCharge: child of GuestFolio, always queried by folioId
CREATE INDEX IF NOT EXISTS "FolioCharge_folioId_idx" ON "FolioCharge"("folioId");

-- RecipeIngredient: child of Recipe, loaded by recipeId
CREATE INDEX IF NOT EXISTS "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- RecipeStep: child of Recipe, loaded by recipeId
CREATE INDEX IF NOT EXISTS "RecipeStep_recipeId_idx" ON "RecipeStep"("recipeId");

-- CateringEvent: listed by tenant with date ordering
CREATE INDEX IF NOT EXISTS "CateringEvent_tenantId_date_idx" ON "CateringEvent"("tenantId", "date");

-- TakeawayOrder: listed by tenant with recent-first ordering and status filter
CREATE INDEX IF NOT EXISTS "TakeawayOrder_tenantId_createdAt_idx" ON "TakeawayOrder"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "TakeawayOrder_tenantId_status_idx" ON "TakeawayOrder"("tenantId", "status");

-- DailyDish: listed by tenant
CREATE INDEX IF NOT EXISTS "DailyDish_tenantId_idx" ON "DailyDish"("tenantId");

-- StaffMember: add foreign key relation to User (userId is already @unique)
-- No DDL needed for FK since Prisma manages this at the application level
-- and userId already has a unique index from @unique annotation.
