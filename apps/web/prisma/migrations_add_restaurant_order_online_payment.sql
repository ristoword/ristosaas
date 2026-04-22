-- Pagamento online menu pubblico (Stripe Checkout): stato paid/unpaid e session id.

CREATE TYPE "RestaurantOrderOnlinePaymentStatus" AS ENUM ('unpaid', 'paid');

ALTER TABLE "RestaurantOrder"
  ADD COLUMN IF NOT EXISTS "onlinePaymentStatus" "RestaurantOrderOnlinePaymentStatus" NOT NULL DEFAULT 'unpaid';

ALTER TABLE "RestaurantOrder"
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantOrder_stripeCheckoutSessionId_key"
  ON "RestaurantOrder" ("stripeCheckoutSessionId");
