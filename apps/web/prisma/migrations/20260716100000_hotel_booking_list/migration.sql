-- Lista prenotazioni: stato in attesa, canale tipizzato, codice voucher.
ALTER TYPE "HotelReservationStatus" ADD VALUE IF NOT EXISTS 'in_attesa';

CREATE TYPE "HotelBookingChannel" AS ENUM ('online', 'desk', 'agency', 'voucher');

ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "voucherCode" TEXT;

ALTER TABLE "HotelReservation" ADD COLUMN IF NOT EXISTS "channel_new" "HotelBookingChannel" NOT NULL DEFAULT 'desk';

UPDATE "HotelReservation"
SET "channel_new" = CASE
  WHEN LOWER(COALESCE("channel", 'direct')) IN ('online', 'web', 'website', 'booking_engine') THEN 'online'::"HotelBookingChannel"
  WHEN LOWER(COALESCE("channel", 'direct')) IN ('agency', 'ota', 'agenzia', 'booking.com', 'expedia') THEN 'agency'::"HotelBookingChannel"
  WHEN LOWER(COALESCE("channel", 'direct')) IN ('voucher', 'coupon', 'buono') THEN 'voucher'::"HotelBookingChannel"
  ELSE 'desk'::"HotelBookingChannel"
END
WHERE TRUE;

ALTER TABLE "HotelReservation" DROP COLUMN IF EXISTS "channel";
ALTER TABLE "HotelReservation" RENAME COLUMN "channel_new" TO "channel";

CREATE INDEX IF NOT EXISTS "HotelReservation_tenantId_channel_status_idx"
  ON "HotelReservation"("tenantId", "channel", "status");
