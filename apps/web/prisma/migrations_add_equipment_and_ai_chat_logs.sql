CREATE TABLE IF NOT EXISTS "WarehouseEquipment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "value" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseEquipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseEquipment_tenantId_name_location_key"
  ON "WarehouseEquipment"("tenantId", "name", "location");

CREATE INDEX IF NOT EXISTS "WarehouseEquipment_tenantId_status_idx"
  ON "WarehouseEquipment"("tenantId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WarehouseEquipment_tenantId_fkey'
  ) THEN
    ALTER TABLE "WarehouseEquipment"
      ADD CONSTRAINT "WarehouseEquipment_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "AiChatLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "userMessage" TEXT NOT NULL,
  "assistantMessage" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiChatLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiChatLog_tenantId_userId_createdAt_idx"
  ON "AiChatLog"("tenantId", "userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiChatLog_tenantId_fkey'
  ) THEN
    ALTER TABLE "AiChatLog"
      ADD CONSTRAINT "AiChatLog_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
