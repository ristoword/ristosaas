-- Persist restaurant rooms and sala tables.

DO $$ BEGIN CREATE TYPE "RestaurantTableShape" AS ENUM ('tondo', 'quadrato'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "RestaurantTableStatus" AS ENUM ('libero', 'aperto', 'conto', 'sporco'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "RestaurantRoom" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tables" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RestaurantTable" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "posti" INTEGER NOT NULL,
  "x" INTEGER NOT NULL,
  "y" INTEGER NOT NULL,
  "forma" "RestaurantTableShape" NOT NULL,
  "stato" "RestaurantTableStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantRoom_tenantId_name_key" ON "RestaurantRoom"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "RestaurantRoom_tenantId_idx" ON "RestaurantRoom"("tenantId");
CREATE INDEX IF NOT EXISTS "RestaurantTable_tenantId_roomId_idx" ON "RestaurantTable"("tenantId", "roomId");

DO $$ BEGIN ALTER TABLE "RestaurantRoom" ADD CONSTRAINT "RestaurantRoom_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "RestaurantRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
