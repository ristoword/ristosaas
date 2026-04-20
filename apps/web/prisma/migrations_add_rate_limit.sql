-- Rate limit persistente (DB-based, senza Redis).
-- Safe / idempotente.

CREATE TABLE IF NOT EXISTS "RateLimitHit" (
  "id" BIGSERIAL PRIMARY KEY,
  "bucket" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "RateLimitHit_bucket_keyHash_createdAt_idx"
  ON "RateLimitHit" ("bucket", "keyHash", "createdAt");

CREATE INDEX IF NOT EXISTS "RateLimitHit_createdAt_idx"
  ON "RateLimitHit" ("createdAt");
