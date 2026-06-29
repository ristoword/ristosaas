-- Housekeeping Enterprise Gold

CREATE TYPE "HousekeepingPmsCode" AS ENUM (
  'VC', 'VD', 'OC', 'OD', 'INSPECTED', 'CLEAN', 'DIRTY', 'PICKUP', 'TOUCHED',
  'OOO', 'OOS', 'MAINTENANCE', 'BLOCKED', 'VIP_READY', 'DND', 'LATE_CO', 'EARLY_ARR'
);

CREATE TYPE "HousekeepingTaskType" AS ENUM (
  'departure', 'stayover', 'deep_clean', 'turndown', 'vip', 'daily', 'checkout'
);

CREATE TYPE "HousekeepingPriority" AS ENUM ('low', 'normal', 'high', 'critical', 'vip');

CREATE TYPE "MaintenanceTicketStatus" AS ENUM (
  'open', 'assigned', 'in_progress', 'waiting_parts', 'resolved', 'closed'
);

CREATE TYPE "MaintenancePriority" AS ENUM ('low', 'normal', 'high', 'urgent');

ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "hkPmsCode" "HousekeepingPmsCode";
ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "doNotDisturb" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "vipReady" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "hkPriority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "estimatedCleanMin" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "hkNotes" TEXT;
ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "taskType" "HousekeepingTaskType" NOT NULL DEFAULT 'departure';
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "priority" "HousekeepingPriority" NOT NULL DEFAULT 'normal';
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "estimatedMin" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "actualMin" INTEGER;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "voiceNoteUrl" TEXT;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "signatureData" TEXT;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "photosJson" TEXT;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "checklistJson" TEXT;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "arrivalDate" TIMESTAMP(3);
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "departureDate" TIMESTAMP(3);
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "inspectionLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "inspectedAt" TIMESTAMP(3);
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "inspectedByUserId" TEXT;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "HousekeepingTask" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "HousekeepingTask_tenantId_status_idx" ON "HousekeepingTask"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "HousekeepingTask_tenantId_scheduledFor_idx" ON "HousekeepingTask"("tenantId", "scheduledFor");
CREATE INDEX IF NOT EXISTS "HousekeepingTask_roomId_scheduledFor_idx" ON "HousekeepingTask"("roomId", "scheduledFor");

CREATE TABLE IF NOT EXISTS "HousekeepingChecklistTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "roomType" TEXT NOT NULL,
  "taskType" "HousekeepingTaskType" NOT NULL,
  "itemsJson" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HousekeepingChecklistTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HousekeepingInspection" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "supervisorId" TEXT,
  "signatureData" TEXT,
  "photosJson" TEXT,
  "comments" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HousekeepingInspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MaintenanceTicket" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "MaintenanceTicketStatus" NOT NULL DEFAULT 'open',
  "priority" "MaintenancePriority" NOT NULL DEFAULT 'normal',
  "assignedToUserId" TEXT,
  "materials" TEXT,
  "cost" DECIMAL(10,2),
  "estimatedMin" INTEGER,
  "actualMin" INTEGER,
  "photosJson" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HousekeepingAuditLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "roomId" TEXT,
  "taskId" TEXT,
  "action" TEXT NOT NULL,
  "field" TEXT,
  "oldValue" TEXT,
  "newValue" TEXT,
  "userId" TEXT,
  "userName" TEXT,
  "userRole" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "device" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HousekeepingAuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HousekeepingChecklistTemplate" ADD CONSTRAINT "HousekeepingChecklistTemplate_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousekeepingInspection" ADD CONSTRAINT "HousekeepingInspection_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousekeepingInspection" ADD CONSTRAINT "HousekeepingInspection_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "HousekeepingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousekeepingInspection" ADD CONSTRAINT "HousekeepingInspection_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "HotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "HotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousekeepingAuditLog" ADD CONSTRAINT "HousekeepingAuditLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "HousekeepingChecklistTemplate_tenantId_roomType_taskType_idx"
  ON "HousekeepingChecklistTemplate"("tenantId", "roomType", "taskType");
CREATE INDEX IF NOT EXISTS "HousekeepingInspection_tenantId_roomId_idx" ON "HousekeepingInspection"("tenantId", "roomId");
CREATE INDEX IF NOT EXISTS "HousekeepingInspection_taskId_level_idx" ON "HousekeepingInspection"("taskId", "level");
CREATE INDEX IF NOT EXISTS "MaintenanceTicket_tenantId_status_idx" ON "MaintenanceTicket"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "MaintenanceTicket_roomId_idx" ON "MaintenanceTicket"("roomId");
CREATE INDEX IF NOT EXISTS "HousekeepingAuditLog_tenantId_createdAt_idx" ON "HousekeepingAuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "HousekeepingAuditLog_roomId_idx" ON "HousekeepingAuditLog"("roomId");

-- Backfill PMS codes from legacy status
UPDATE "HotelRoom" SET "hkPmsCode" = 'VD' WHERE "status" = 'da_pulire' AND "hkPmsCode" IS NULL;
UPDATE "HotelRoom" SET "hkPmsCode" = 'VC' WHERE "status" IN ('libera', 'pulita') AND "hkPmsCode" IS NULL;
UPDATE "HotelRoom" SET "hkPmsCode" = 'OC' WHERE "status" = 'occupata' AND "hkPmsCode" IS NULL;
UPDATE "HotelRoom" SET "hkPmsCode" = 'OOO' WHERE "status" = 'fuori_servizio' AND "hkPmsCode" IS NULL;
UPDATE "HotelRoom" SET "hkPmsCode" = 'MAINTENANCE' WHERE "status" = 'manutenzione' AND "hkPmsCode" IS NULL;
