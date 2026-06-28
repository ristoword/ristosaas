-- Guest Folio PMS extensions

-- AlterTable HotelReservation
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'direct';
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "children" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "crib" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "lateCheckout" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "earlyCheckin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "depositReceived" DECIMAL(10,2);
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "receptionNotes" TEXT;
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "packageName" TEXT;
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "ratePlanName" TEXT;

-- AlterTable GuestFolio
ALTER TABLE "GuestFolio" ADD COLUMN IF NOT EXISTS "locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GuestFolio" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "GuestFolio" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable FolioCharge
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "operator" TEXT;
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1;
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(10,2);
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "vatPct" DECIMAL(5,2) NOT NULL DEFAULT 10;
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "section" TEXT;
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "splitCode" TEXT NOT NULL DEFAULT 'A';
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "lineStatus" TEXT NOT NULL DEFAULT 'posted';
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
ALTER TABLE "FolioCharge" ADD COLUMN IF NOT EXISTS "createdByName" TEXT;

CREATE INDEX IF NOT EXISTS "FolioCharge_folioId_postedAt_idx" ON "FolioCharge"("folioId", "postedAt");
CREATE INDEX IF NOT EXISTS "FolioCharge_folioId_splitCode_idx" ON "FolioCharge"("folioId", "splitCode");

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FolioAttachmentType" AS ENUM ('document', 'passport', 'contract', 'signature', 'voucher', 'receipt', 'photo');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable FolioAuditLog
CREATE TABLE IF NOT EXISTS "FolioAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "chargeId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FolioAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FolioAuditLog_tenantId_folioId_createdAt_idx" ON "FolioAuditLog"("tenantId", "folioId", "createdAt");

ALTER TABLE "FolioAuditLog" DROP CONSTRAINT IF EXISTS "FolioAuditLog_tenantId_fkey";
ALTER TABLE "FolioAuditLog" ADD CONSTRAINT "FolioAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FolioAuditLog" DROP CONSTRAINT IF EXISTS "FolioAuditLog_folioId_fkey";
ALTER TABLE "FolioAuditLog" ADD CONSTRAINT "FolioAuditLog_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "GuestFolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable FolioAttachment
CREATE TABLE IF NOT EXISTS "FolioAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "type" "FolioAttachmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "dataBase64" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FolioAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FolioAttachment_tenantId_folioId_idx" ON "FolioAttachment"("tenantId", "folioId");

ALTER TABLE "FolioAttachment" DROP CONSTRAINT IF EXISTS "FolioAttachment_tenantId_fkey";
ALTER TABLE "FolioAttachment" ADD CONSTRAINT "FolioAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FolioAttachment" DROP CONSTRAINT IF EXISTS "FolioAttachment_folioId_fkey";
ALTER TABLE "FolioAttachment" ADD CONSTRAINT "FolioAttachment_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "GuestFolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
