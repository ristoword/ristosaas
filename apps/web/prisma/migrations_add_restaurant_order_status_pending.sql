-- Ordini da menu pubblico: stato iniziale `pending` prima di essere presi in carico in sala/cucina.

ALTER TYPE "RestaurantOrderStatus" ADD VALUE IF NOT EXISTS 'pending';
