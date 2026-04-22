-- Pagamento online menu pubblico (Stripe Checkout): stato paid/unpaid e session id.
-- Idempotente: eseguibile più volte.

DO $migrate$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RestaurantOrderOnlinePaymentStatus') THEN
    CREATE TYPE "RestaurantOrderOnlinePaymentStatus" AS ENUM ('unpaid', 'paid');
  END IF;
END
$migrate$;

ALTER TABLE "RestaurantOrder"
  ADD COLUMN IF NOT EXISTS "onlinePaymentStatus" "RestaurantOrderOnlinePaymentStatus" NOT NULL DEFAULT 'unpaid';


ALTER TABLE "RestaurantOrder"
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;


CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantOrder_stripeCheckoutSessionId_key"
  ON "RestaurantOrder" ("stripeCheckoutSessionId");
