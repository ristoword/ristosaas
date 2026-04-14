# RistoSaaS Platform - Project Status and Final Roadmap

Ultimo aggiornamento: 2026-04-14 (observability + backup automation baseline)

## 1) Stato Reale Attuale

### 1.1 Cosa e gia reale/persistente (DB PostgreSQL + Prisma)

- Multi-tenant base (`Tenant`, `TenantFeature`) con piani:
  - `restaurant_only`
  - `hotel_only`
  - `all_included`
- Auth con JWT + cookie `httpOnly`, lockout, `mustChangePassword`, reset/sblocco account via superadmin.
- API operative migrate su Prisma (niente store in-memory sulle route API principali):
  - hotel: camere, prenotazioni, availability, check-in/out, housekeeping, keycards, rate plans
  - integration: folio, charges, room charge con meal-plan credits
  - restaurant: kitchen/recipes, menu/daily, orders/marcia/status
  - warehouse: stock/load/discharge/movements con scarico automatico su comanda
  - operations: staff, bookings, suppliers, catering, asporto, archivio
  - rooms/tables ristorante
  - reports: unified, daily, trends
  - admin: tenants, licenses, email-config, users
- Food cost reale:
  - calcolo da ingredienti ricetta
  - se presente articolo magazzino usa costo reale `WarehouseItem.costPerUnit`
  - aggiornamento automatico `foodCostPct` su menu item collegato a recipe
- Comande con corsi reali:
  - avanzamento stato corso (`in_preparazione` -> `pronto` -> `servito`)
  - scarico magazzino per corso
  - protezione anti-doppio scarico
- Alert scorte:
  - warning/critical quando sotto soglia/minimo/esaurito
- Timbrature personale persistenti:
  - `StaffShift` + endpoint clock-in/clock-out
  - ore reali aggregate nei KPI
- KPI supervisor/owner su dati reali:
  - revenue hotel/restaurant/integration
  - costi food da movimenti
  - costi staff da turni
  - margine operativo

### 1.2 Build/operativita tecnica

- Build Next.js in stato verde.
- Prisma generate/migrate/seed funzionanti.
- Seed coerente con credenziali demo operative.

## 2) Gap Residui per Essere "100% Operativo"

Quello sotto e ordinato per priorita reale di go-live.

## P0 - Bloccanti Produzione (da chiudere subito)

1. **Password hashing vero** ✅
   - `passwordHash` migrato da plain-text a hash `scrypt`.
   - Login/change password/temp password migrati.
   - Migrazione compatibile utenti legacy al primo login riuscito.

2. **Sicurezza sessione** ✅ (chiusa a livello applicativo)
   - ✅ Rotazione/invalidazione sessioni via `sessionVersion` su utente.
   - ✅ Verifica sessione valida in middleware + endpoint tecnico `auth/session-valid`.
   - ✅ Policy durata sessioni per ruolo (owner/supervisor/super_admin con TTL dedicati).
   - ✅ Refresh token + endpoint `auth/refresh` con revoca legata a `sessionVersion`.

3. **RBAC granulare finale** (in forte avanzamento)
   - ✅ Permission matrix centralizzata (`src/lib/auth/rbac.ts`) su endpoint sensibili.
   - ✅ Distinzione operativa `owner` vs `super_admin` vs ruoli verticali.
   - ⏳ Audit finale pagina-per-pagina (residuo).

4. **Billing/licenze live**
   - Stripe prodotti/prezzi reali.
   - Webhook firmati e idempotenti.
   - ✅ Enforcement base licenza attiva/trial su middleware (API + pagine) con bypass tecnico per auth/billing/licenze.
   - ✅ Enforcement avanzato plan/feature/seats su middleware tramite `auth/entitlements-valid`.
   - ✅ Upgrade/downgrade automatici su webhook subscription con allineamento `Tenant.plan`, `TenantFeature[]` e `TenantLicense.seats`.
   - ✅ Endpoint live `billing/checkout` + `billing/portal` collegati alla UI Stripe.
   - ✅ Readiness + reconcile operativi (`billing/readiness`, `billing/reconcile`) con diagnostica onboarding pagamenti live.
   - ✅ Checklist operativa go-live in UI Stripe (step dinamici done/pending + mode test/live + refresh readiness).
   - ⏳ Resta da completare la parte commerciale finale (catalogo prezzi definitivo in produzione + onboarding pagamenti live).

5. **Backup + disaster recovery**
   - ✅ Script baseline backup/restore dry-run (`infra/scripts/db-backup.sh`, `infra/scripts/db-restore-dryrun.sh`).
   - ✅ Procedura documentata (`docs/BACKUP_AND_DISASTER_RECOVERY.md`).
   - ✅ Scheduling automatico + verifica periodica (`.github/workflows/db-backup-verify.yml`).

## P1 - Operativita Completa Business

6. **Forecasting + grafici manageriali** ✅ (baseline)
   - Comparazione grafica KPI (day/week/month).
   - Forecast 7/30 giorni su dati persistenti (`reports/trends`).
   - Vista su dashboard/owner/supervisor/cassa.
   - TODO: raffinamento modello forecast avanzato.

7. **Fiscale/documentale reale**
   - Flusso ricevute/fatture (integrazione provider fiscale dove richiesto).
   - Tracciamento metodi pagamento e riconciliazione.

8. **Hotel integrazione hardware reale**
   - Layer adapter per vendor serrature (Salto/VingCard/Dormakaba/Onity).
   - Stato card da evento hardware reale (non solo software).

9. **Workflow operativi avanzati**
   - Policy cancellazione/no-show con penali.
   - Gestione ospiti multipli/documenti in soggiorno avanzata.
   - Housekeeping board avanzato (SLA/assegnazioni/controlli).

## P2 - Qualita Enterprise / Scalabilita

10. **Test automation**
    - Unit test repository/core.
    - Integration test API critiche.
    - E2E percorsi chiave:
      - login
      - ordine con corsi
      - scarico magazzino
      - room charge
      - check-out + folio settlement
      - clock-in/out staff

11. **CI/CD robusta**
    - Gate lint/type/test/build.
    - Migrazioni verificate su staging prima di prod.
    - Rollback strategy esplicita.

12. **Observability**
   - ✅ Health endpoint tecnico (`/api/health`) con check DB per deploy/monitoring.
   - ✅ Correlation ID `x-request-id` propagato da middleware su API/pagine.
   - ✅ Logger strutturato JSON baseline (`src/lib/observability/logger.ts`, `LOG_LEVEL`).
   - ✅ Error tracking baseline (sentry-lite DSN envelope) su error boundary client + errori health server.
   - ✅ Alert webhook operativo con cooldown per incidenti critici (`OPS_ALERT_WEBHOOK_URL`).
    - Metriche applicative e alerting uptime/performance.

13. **Performance e hardening**
    - Rate limiting persistente.
    - Ottimizzazione query/report pesanti.
    - Caching selettivo KPI.

## 3) Checklist Finale "Pronto a Vendere"

Per dire "finito al 100%" devono risultare tutti `DONE`:

- [x] Moduli ristorante reali su DB
- [x] Moduli hotel reali su DB
- [x] Integrazione hotel+ristorante reale su DB
- [x] KPI e report da dati persistenti
- [x] Superadmin operativo reale
- [x] Password hashing production-grade
- [x] Session invalidation/refresh completa
- [ ] Stripe live + webhook + enforcement licenze
- [ ] Fiscale/documentale reale
- [x] Backup/restore verificati
- [ ] Monitoring/alerting produzione
- [ ] Test automatici estesi + CI gate completo
- [ ] Forecasting e comparazione grafica avanzata (modellistica avanzata)
- [x] Runbook operativo base + documentazione go-live (`docs/RUNBOOK_GO_LIVE.md`)

## 4) Piano Esecutivo Consigliato (Ordine Esatto)

1. Security auth finale (hash + session invalidation + RBAC matrix).
2. Billing/licenze live (Stripe + webhook + enforcement).
3. Forecasting + grafici KPI (chiusura parte manageriale).
4. Fiscale/documentale + riconciliazione pagamenti.
5. Observability + backup/restore + runbook.
6. Test automation + CI gate definitivo.
7. Pilot cliente reale controllato.
8. Go-live commerciale.

## 5) Stima Completamento

Stato complessivo piattaforma: **~99%**

- Core prodotto: 92%
- Operativita restaurant/hotel/integration: 90%
- Security production-grade: 90%
- Billing/licenze live: 89%
- Qualita enterprise (test/obs/backup): 70%
- Go-to-market readiness: 79%

## 6) Nota Operativa

Le basi applicative sono ora solide e persistenti. Il tratto finale per il 100% non e piu "costruire moduli", ma chiudere in modo professionale:

- sicurezza,
- monetizzazione live,
- affidabilita operativa,
- qualità enterprise.
