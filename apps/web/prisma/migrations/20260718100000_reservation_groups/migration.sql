-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ReservationGroupStatus" AS ENUM ('tentative', 'confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReservationGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "company" TEXT,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "ReservationGroupStatus" NOT NULL DEFAULT 'tentative',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationGroup_pkey" PRIMARY KEY ("id")
);

-- Add groupId to HotelReservation
ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReservationGroup_tenantId_status_idx" ON "ReservationGroup"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ReservationGroup_tenantId_checkInDate_idx" ON "ReservationGroup"("tenantId", "checkInDate");
CREATE INDEX IF NOT EXISTS "HotelReservation_tenantId_groupId_idx" ON "HotelReservation"("tenantId", "groupId");

-- AddForeignKey
ALTER TABLE "ReservationGroup" DROP CONSTRAINT IF EXISTS "ReservationGroup_tenantId_fkey";
ALTER TABLE "ReservationGroup" ADD CONSTRAINT "ReservationGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HotelReservation" DROP CONSTRAINT IF EXISTS "HotelReservation_groupId_fkey";
ALTER TABLE "HotelReservation" ADD CONSTRAINT "HotelReservation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ReservationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
