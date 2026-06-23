-- Add new premium plan values to the ProductPlan enum.
-- These are additive-only, no existing data is affected.

ALTER TYPE "ProductPlan" ADD VALUE IF NOT EXISTS 'risto_premium';
ALTER TYPE "ProductPlan" ADD VALUE IF NOT EXISTS 'risto_premium_gold';
ALTER TYPE "ProductPlan" ADD VALUE IF NOT EXISTS 'hotel_premium';
ALTER TYPE "ProductPlan" ADD VALUE IF NOT EXISTS 'hotel_premium_gold';
