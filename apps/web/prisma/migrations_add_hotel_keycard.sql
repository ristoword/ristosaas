-- Safe additive migration for HotelKeycard support
-- No destructive statements.

DO $$ BEGIN
  CREATE TYPE "KeycardStatus" AS ENUM ('attiva', 'scaduta', 'annullata');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "HotelKeycard" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "status" "KeycardStatus" NOT NULL,
  "issuedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelKeycard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HotelKeycard_tenantId_reservationId_idx" ON "HotelKeycard"("tenantId", "reservationId");
CREATE INDEX IF NOT EXISTS "HotelKeycard_tenantId_roomId_idx" ON "HotelKeycard"("tenantId", "roomId");

DO $$ BEGIN
  ALTER TABLE "HotelKeycard"
    ADD CONSTRAINT "HotelKeycard_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "HotelKeycard"
    ADD CONSTRAINT "HotelKeycard_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "HotelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "HotelKeycard"
    ADD CONSTRAINT "HotelKeycard_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "HotelReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
