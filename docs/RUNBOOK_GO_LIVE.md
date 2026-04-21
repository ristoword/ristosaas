# Runbook Go-Live (RistoSimply)

## 1) Pre-deploy Checklist

- Verifica `pnpm --filter web lint` e `pnpm --filter web build` verdi su `main`.
- Verifica `DATABASE_URL` punta al database di produzione.
- Verifica variabili Stripe:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_*`
  - `STRIPE_CHECKOUT_SUCCESS_URL`
  - `STRIPE_CHECKOUT_CANCEL_URL`
  - `STRIPE_PORTAL_RETURN_URL`
- Apri la pagina `stripe` e controlla `Readiness go-live billing`.
- Verifica variabili observability:
  - `SENTRY_ENABLED`
  - `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
  - `OPS_ALERT_WEBHOOK_URL`
  - `OPS_ALERT_COOLDOWN_SECONDS`

## 2) Deploy Railway

- Deploy automatico da `main`.
- Healthcheck configurato su `GET /api/health`.
- Conferma `status: ok` e `db: up`.

## 3) Smoke Test Post-deploy

- Login come `super_admin`.
- Verifica che le risposte API includano header `x-request-id`.
- Verifica accesso a:
  - dashboard
  - super-admin
  - licenses
  - stripe
- Esegui:
  - apertura customer portal Stripe
  - test checkout su tenant demo
  - reconcile entitlements
- Verifica report dashboard senza errori 500.

## 4) Incident Response

### Login/API down
- Controlla log Railway runtime.
- Usa `x-request-id` per correlare errore client/server nei log JSON.
- Verifica connessione DB (`/api/health`).
- Se `db: down`, ripristina con credenziali DB valide e riavvia deploy.
- Se configurato, verifica alert webhook ricevuto e evento su Sentry (sentry-lite envelope).

### Billing incoerente (piano/features)
- Apri `stripe` e lancia `Riconcilia entitlements`.
- Se persiste, controlla eventi webhook recenti in `BillingEvent`.

### Performance degradata
- Controlla query lente sui report.
- Riduci finestre temporali per analisi ad alto volume.

## 5) Rollback

- Ripristina ultimo commit stabile su `main`.
- Redeploy Railway.
- Riesegui smoke test minimo:
  - login
  - dashboard
  - `/api/health`
- Per recovery DB usa:
  - `./infra/scripts/db-backup.sh`
  - `./infra/scripts/db-restore-dryrun.sh ./storage/backups/latest.dump`
  - riferimento operativo: `docs/BACKUP_AND_DISASTER_RECOVERY.md`

## 6) Exit Criteria

Il go-live e considerato stabile quando:
- `/api/health` resta `ok` per 24h.
- Nessun 500 critico su login/dashboard.
- Billing readiness in stato pronto per tenant di produzione.
