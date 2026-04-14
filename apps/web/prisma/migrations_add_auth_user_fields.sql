-- Persist auth lockout/password-change policies on DB user model.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
