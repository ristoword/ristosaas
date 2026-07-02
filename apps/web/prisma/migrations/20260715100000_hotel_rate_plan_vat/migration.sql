-- Listino: prezzi IVA inclusa (default allineato al mercato IT alberghiero).
ALTER TABLE "HotelRatePlan" ADD COLUMN IF NOT EXISTS "priceIncludesVat" BOOLEAN NOT NULL DEFAULT true;
