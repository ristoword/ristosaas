# RistoSimply — Funzionalità attive e operative

Questo documento descrive in modo sintetico cosa fa il progetto, cosa può fare e le funzioni attive e operative (stato 2026-04-21 / aggiornamento 2026-06-17).

**Panoramica**
- RistoSimply è un gestionale multi-tenant per ristoranti e hotel (Next.js + Prisma + PostgreSQL).
- Architettura: `apps/web` (frontend + API routes Next.js), Prisma per DB, migrations in `apps/web/prisma`, CI e test Playwright/Vitest.

**Requisiti minimi locali**
- Node.js >= 20
- pnpm 9.x (usa `pnpm` workspace)
- PostgreSQL 16 avviato localmente
- File env: copia `apps/web/.env.example` -> `apps/web/.env.local` e impostare `DATABASE_URL`, `JWT_SECRET`, `SEED_SUPERADMIN_PASSWORD`.

Esempio comandi locali:

```bash
cd apps/web
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ristosimply npx prisma db push --accept-data-loss
node prisma/seed.mjs
pnpm dev
```

**Funzionalità attive e operative (sintesi)**
- Multi-tenant
  - Modelli `Tenant`, `TenantFeature`, piani `restaurant_only`, `hotel_only`, `all_included`.
- Autenticazione e sessioni
  - JWT + cookie `httpOnly`, `UserSession` con `jti` UUID v4 e revoca puntuale.
  - Lockout, reset password, mustChangePassword, refresh token flow.
- Hotel
  - Camere, prenotazioni, disponibilità, check-in/check-out, housekeeping, keycards, rate plans.
  - Folio/charges/room charge integrati.
- Ristorante
  - Menu (daily), ricette, kitchen/KDS, comande con corsi (stati: `in_preparazione` -> `pronto` -> `servito`).
  - QR tavoli reali con token HMAC firmato.
- Magazzino (Warehouse)
  - Stock, carico/scarico, movimenti, costo reale (`WarehouseItem.costPerUnit`).
  - Suggeritore ordine fornitore, avvisi soglie (warning/critical).
  - Ordini fornitore: creazione, invio, ricezione merce -> carico magazzino, PDF email report acquisti.
- Operations
  - Staff, turni (`StaffShift`), timbrature clock-in/clock-out, KPI aggregati (ore, costi staff).
  - Bookings, suppliers, catering, asporto.
- Report e KPI
  - Revenue (hotel/restaurant/integration), food cost calcolato da ingredienti/warehouse cost,
  - Margin e report giornalieri/aggregati.
- AI
  - Chat OpenAI persistita su DB (`AiChatLog`) con rate-limit DB-backed.
  - Endpoint insight cucina (`/api/ai/kitchen/insights`) e workflow AI proposals (draft -> pending_review -> approved -> applied).
- Hardware
  - Modelli `HardwareDevice` e `PrintRoute` tenant-scoped. API CRUD dispositivi e rotte stampa.
  - UI dispositivi/rotte in `apps/web` (tab Dispositivi + Rotte stampa).
- HACCP
  - `HaccpEntry` persistente, API CRUD, interfaccia UI per registro HACCP.
- SMTP
  - Invio reale via `nodemailer` attraverso `sendTenantMail` (test SMTP con feedback messageId).
- SEO / Pubblico
  - Landing pubblica ottimizzata, pillar page, blog (JSON-LD schema SoftwareApplication e Article), signup pubblico + checkout Stripe (rate limiting persistente).
- Health / Ops
  - Endpoint health inclusi `/api/health/ai` (da restringere), backup/restore workflow attivo.
- Test & CI
  - Smoke E2E Playwright (`apps/web/e2e/smoke.spec.ts`), pipeline CI presente, workflow backup e billing.

**Caratteristiche tecniche rilevanti**
- DB gestito via Prisma: migrations in `apps/web/prisma/migrations`.
- RBAC: matrice unica `API_ROLE_RULES` e guards centralizzati; `requireApiUser` allinea ruoli per ridurre drift.
- Sessioni e revoca: `UserSession` con JTI e API `GET/DELETE /api/sessions`.
- Zero-mock policy applicata su molte UI area: molti bottoni mock rimossi o sostituiti con implementazioni reali.

**Flussi operativi principali (user-facing)**
- Onboarding tenant: bootstrap automatico (rate plans, rooms, tables, warehouse, recipes, menu, staff).
- Ordine in sala: creazione comanda -> corsi -> scarico magazzino per corso -> avanzamento stato -> audit & archiviazione alla chiusura.
- Check-in hotel: creazione Stay, collegamento a Reservation, folio settlement.
- Ricezione merce: creazione PO -> invio al fornitore -> ricezione merce -> carico magazzino reale.
- Chiusure e report: export CSV UTF-8 (BOM) per varie pagine, report acquisti mensili.

**Limitazioni note / work-in-progress**
- Flusso Cassa (chiusura conto + stampa termica/PDF) è ancora work-in-progress (M1 nel roadmap).
- Stripe: codice pronto, ma catalogo prezzi live e E2E checkout/webhook richiede validazione e test in produzione.
- Print server (coda stampa reale) non è ancora disponibile; la tab "Coda stampa" è disabilitata.
- `/api/health/ai` esposto: consigliato restringere a `super_admin` + `owner`.
- Alcuni bottoni e calcolatori (Asporto, Lista spesa persistente, Voice buttons) sono pianificati ma non tutti persistenti.

**Dove guardare il codice**
- Frontend + API routes: `apps/web`
- Prisma schema + migrations: `apps/web/prisma`
- E2E tests: `apps/web/e2e`
- Docs e roadmap: `PROJECT_STATUS_AND_ROADMAP.md` (root)
- Hardware schema & migration: cerca `migrations_add_hardware.sql` in `apps/web/prisma/migrations`.

**Prossimi passi consigliati**
- Completare flusso Cassa (M1) e integrazione stampa/print-server.
- Finalizzare catalogo Stripe e completare E2E billing live.
- Abilitare osservabilità/alerting (`OPS_ALERT_WEBHOOK_URL`) in deploy.
- Estendere test automatici (unit/integration/e2e) per percorsi critici.

---

Se vuoi, posso:
- Espandere questo documento con diagrammi e link a file specifici.
- Generare una versione sintetica in inglese per il team commerciale.
- Aggiungere riferimenti diretti a file sorgente (link con linee).

