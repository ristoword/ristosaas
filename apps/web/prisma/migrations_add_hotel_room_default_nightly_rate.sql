-- HotelRoom.defaultNightlyRate: listino per notte collegato a prenotazioni / booking.
ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "defaultNightlyRate" DECIMAL(10, 2) NOT NULL DEFAULT 0;
