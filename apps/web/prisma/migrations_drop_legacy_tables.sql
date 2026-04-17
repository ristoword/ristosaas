-- Drop legacy (pre-Prisma) tables that are empty and unused.
-- Safe to re-run: uses IF EXISTS.
-- Verified before applying:
--   * all tables had 0 rows on the Railway DB
--   * no foreign keys referenced them
--   * no application code references them

BEGIN;

DROP TABLE IF EXISTS "bookings" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "rooms" CASCADE;
DROP TABLE IF EXISTS "tenant_settings" CASCADE;
DROP TABLE IF EXISTS "tenants" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

COMMIT;
