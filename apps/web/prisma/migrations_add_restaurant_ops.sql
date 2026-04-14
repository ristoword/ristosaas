-- Add restaurant operational entities (recipes/menu/orders) on existing schema.
-- Safe strategy: create-if-not-exists + additive foreign keys/indexes.

DO $$ BEGIN
  CREATE TYPE "RestaurantOrderArea" AS ENUM ('sala', 'cucina', 'bar', 'pizzeria');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Recipe" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "area" "RestaurantOrderArea" NOT NULL,
  "portions" INTEGER NOT NULL,
  "sellingPrice" DECIMAL(10,2) NOT NULL,
  "targetFcPct" DECIMAL(5,2) NOT NULL,
  "ivaPct" DECIMAL(5,2) NOT NULL,
  "overheadPct" DECIMAL(5,2) NOT NULL,
  "packagingCost" DECIMAL(10,2) NOT NULL,
  "laborCost" DECIMAL(10,2) NOT NULL,
  "energyCost" DECIMAL(10,2) NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "qty" DECIMAL(12,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "unitCost" DECIMAL(12,4) NOT NULL,
  "wastePct" DECIMAL(5,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "RecipeStep" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "text" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "MenuItem" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "code" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "recipeId" TEXT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "foodCostPct" DECIMAL(5,2) NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DailyDish" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "allergens" TEXT NOT NULL DEFAULT '',
  "recipeId" TEXT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RestaurantOrder" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "table" TEXT NULL,
  "covers" INTEGER NULL,
  "area" "RestaurantOrderArea" NOT NULL,
  "waiter" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "activeCourse" INTEGER NOT NULL,
  "courseStates" JSONB NOT NULL,
  "status" "RestaurantOrderStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RestaurantOrderItem" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "category" TEXT NULL,
  "area" "RestaurantOrderArea" NOT NULL,
  "price" DECIMAL(10,2) NULL,
  "note" TEXT NULL,
  "course" INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "Recipe_tenantId_name_key" ON "Recipe"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "Recipe_tenantId_idx" ON "Recipe"("tenantId");
CREATE INDEX IF NOT EXISTS "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");
CREATE INDEX IF NOT EXISTS "RecipeStep_recipeId_idx" ON "RecipeStep"("recipeId");
CREATE INDEX IF NOT EXISTS "MenuItem_tenantId_idx" ON "MenuItem"("tenantId");
CREATE INDEX IF NOT EXISTS "DailyDish_tenantId_idx" ON "DailyDish"("tenantId");
CREATE INDEX IF NOT EXISTS "RestaurantOrder_tenantId_createdAt_idx" ON "RestaurantOrder"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "RestaurantOrderItem_orderId_idx" ON "RestaurantOrderItem"("orderId");

DO $$ BEGIN
  ALTER TABLE "Recipe"
    ADD CONSTRAINT "Recipe_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "RecipeStep"
    ADD CONSTRAINT "RecipeStep_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MenuItem"
    ADD CONSTRAINT "MenuItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MenuItem"
    ADD CONSTRAINT "MenuItem_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DailyDish"
    ADD CONSTRAINT "DailyDish_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DailyDish"
    ADD CONSTRAINT "DailyDish_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "RestaurantOrder"
    ADD CONSTRAINT "RestaurantOrder_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "RestaurantOrderItem"
    ADD CONSTRAINT "RestaurantOrderItem_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
