-- Partner kind: commercial (dealer con commissioni) | socio (equity partner, senza %)
ALTER TABLE "Partner" ADD COLUMN "partnerKind" TEXT NOT NULL DEFAULT 'commercial';

UPDATE "Partner"
SET
  "partnerKind" = 'socio',
  "commissionEuros" = 0,
  "allInclusiveCommission" = 0,
  "commissionPct" = 0,
  "commissionType" = 'fixed',
  "notes" = 'Socio partner — Baia Verde'
WHERE "code" = 'laudani';
