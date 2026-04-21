-- UserSession: registro sessioni attive per listing e revoca puntuale.
-- Coesiste con il check `sessionVersion` che continua a funzionare come
-- "kill-all" globale per utente. Questo modello e' usato solo per tracking
-- e revoca granulare di singole sessioni.
-- Idempotent DDL.

CREATE TABLE IF NOT EXISTS "UserSession" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "tenantId"   TEXT,
  "jti"        TEXT NOT NULL UNIQUE,
  "tokenType"  TEXT NOT NULL DEFAULT 'access',
  "userAgent"  TEXT,
  "ipAddress"  TEXT,
  "issuedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "revokedAt"  TIMESTAMP(3),
  "revokedBy"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserSession_userId_revokedAt_idx"
  ON "UserSession" ("userId", "revokedAt");

CREATE INDEX IF NOT EXISTS "UserSession_tenantId_revokedAt_idx"
  ON "UserSession" ("tenantId", "revokedAt");

CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx"
  ON "UserSession" ("expiresAt");
