# RistoSaaS Platform - Project Status and Final Roadmap

Ultimo aggiornamento: 2026-04-21 (audit chirurgico pagina-per-pagina, allineamento commit 2026-04-20)

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
  - rooms/tables ristorante (seed default automatico + drag & drop layout)
  - reports: unified, daily, trends
  - admin: tenants, licenses, email-config, users, platform, system
  - ordini fornitore: creazione, invio, ricezione merce con carico magazzino reale, report acquisti, PDF, email
- Food cost reale:
  - calcolo da ingredienti ricetta
  - se presente articolo magazzino usa costo reale `WarehouseItem.costPerUnit`
  - aggiornamento automatico `foodCostPct` su menu item collegato a recipe
- Comande con corsi reali:
  - avanzamento stato corso (`in_preparazione` -> `pronto` -> `servito`)
  - scarico magazzino per corso
  - protezione anti-doppio scarico
  - audit log admin per azioni sensibili
  - archiviazione automatica su chiusura ordine
- Alert scorte:
  - warning/critical quando sotto soglia/minimo/esaurito
  - suggeritore ordine fornitore da scorte sotto soglia
- Timbrature personale persistenti:
  - `StaffShift` + endpoint clock-in/clock-out
  - ore reali aggregate nei KPI
- KPI supervisor/owner su dati reali:
  - revenue hotel/restaurant/integration
  - costi food da movimenti
  - costi staff da turni
  - margine operativo
- AI operativa reale:
  - chat OpenAI persistita su DB (`AiChatLog`) con rate-limit DB-backed
  - contesto cucina data-driven da PostgreSQL (top vendite, sotto-scorta, sovra-scorta, piatti fattibili)
  - endpoint tecnico insight cucina (`/api/ai/kitchen/insights`)
  - AI proposals workflow (draft -> pending_review -> approved/rejected -> applied)
- Landing pubblica completa + signup pubblico con checkout Stripe + rate limiting persistente.
- QR tavoli reali con token HMAC firmato + ownership check (no mock).
- Bootstrap tenant minimale automatico (rate plans, rooms, tables, warehouse, recipes, menu, staff) per onboarding nuovi tenant.
- Smoke test Playwright baseline (`apps/web/e2e/smoke.spec.ts`).

### 1.2 Lavori chiusi il 2026-04-20 (ieri)

Questi commit NON erano nella precedente versione della roadmap:

- `cbb08f5` landing pubblica, tenant profile server-side, rate limiting DB, signup, QR reali
- `4e927aa` archivio auto su chiusura, AI rate-limit, KDS colors, audit log admin
- `c10e1f3` sala/cucina: marcia + servito intermedi e azioni modal collegate al backend
- `1f04d56` sala: gestione tavoli reale + seed default + fix coordinate fuori canvas
- `2bc782b` bootstrap minimale automatico tenant + drag & drop tavoli
- `b9f8e0d` security: rimossi placeholder Stripe reali da `.env.example`
- `71aa192` health: `/api/health/ai` + riga AI nel dev-access health panel
- `8f21d7a` fix hotel pagina camere muta per RBAC disallineato + Promise.all fail-fast
- `edfda38` fix RBAC owner bloccato da costanti hardcoded (parziale, residuo drift)
- `646e988` hotel check-in reale collegato al backend (prima solo illustrativo)
- `9292d02` cleanup archivio+setup (rimossi bottoni che non facevano nulla)
- `9f9d6fa` suppliers: ordini fornitore + ricezione merce -> carico magazzino reale
- `bced3c8` magazzino: suggerisci ordine fornitore da scorte sotto soglia
- `f083143` PO: email fornitore + PDF ordine + report acquisti mensile

### 1.3 Build/operativita tecnica

- Build Next.js in stato verde.
- Prisma generate/migrate/seed funzionanti.
- Seed coerente con credenziali demo operative.
- `.env.example` (root + `apps/web`) allineati senza duplicati, con placeholder sicuri e senza valori Stripe reali.
- Pipeline CI (`.github/workflows/ci.yml`) presente, gate parziale.
- Backup workflow (`.github/workflows/db-backup-verify.yml`) attivo.
- Billing reconcile weekly (`.github/workflows/billing-reconcile-weekly.yml`) attivo.

## 2) Gap Chirurgici Identificati (audit 2026-04-21)

L'audit pagina-per-pagina ha evidenziato gap non coperti dalla roadmap precedente. Sotto sono suddivisi per gravita reale.

### 2.1 Bottoni BROKEN (onClick mancante - cliccabili senza effetto)

| # | Pagina | Label | Path | Gravita |
|---|--------|-------|------|---------|
| B1 | Hotel Reservations | "Nuova prenotazione" (header) | `hotel-reservations-page.tsx:72` | ALTA |
| B2 | Sala Fullscreen | "Esci fullscreen" | `sala-fullscreen-page.tsx:91` | ALTA |
| B3 | Archivio Comande | "Esporta CSV" (header) | `archivio-comande-page.tsx:65` | MEDIA |
| B4 | Customers (CRM) | "AI Insights" (header) | `customers-page.tsx:134` | MEDIA |
| B5 | Staff | "Modifica" (icona tabella) | `staff-page.tsx` | MEDIA |
| B6 | Dev Access | "Accedi" (token dev) | `dev-access-page.tsx:200` | BASSA |
| B7 | Hardware | "Elimina" dispositivo | `hardware-page.tsx` | BASSA |
| B8 | Super Admin | "AI Assistant" senza env | `super-admin-page.tsx:153` | BASSA |

### 2.2 Bottoni MOCK (action esegue solo flash/alert, non persiste)

| # | Pagina | Label | Gravita |
|---|--------|-------|---------|
| M1 | Cassa | "Simula chiusura" + "Stampa conto" | ALTA |
| M2 | Cassa Chiusura Z | "Esporta PDF" (usa handlePrint) | MEDIA |
| M3 | Cassa Chiusura Z | "Aggiorna chiusura" (handleClose esce early) | ALTA |
| M4 | Dev Access | "Sblocca utente", "Reset licenza", "Svuota cache", "Force logout tutti" | MEDIA |
| M5 | Sessions | "Disconnetti tutte", "Disconnetti" | ALTA (contraddice claim P0 security) |
| M6 | Magazzino | "Voice" header | BASSA |
| M7 | Cucina/Pizzeria/Bar | "Voice" header (7 istanze) | BASSA |
| M8 | Cucina | "HACCP Registra" | ALTA |
| M9 | Cucina | "Turni cucina Aggiungi" | MEDIA |
| M10 | Pizzeria/Bar | Note vocali Salva/Cancella | BASSA |
| M11 | Asporto | Calcolatore preventivo | MEDIA |
| M12 | Catering | Tab Calcolatore intero | MEDIA |
| M13 | Daily Menu | Toggle "Menu attivo" | ALTA |
| M14 | Magazzino | Lista spesa Aggiungi/checkbox | MEDIA |
| M15 | Super Admin | Blocca/Sblocca errori ingoiati | MEDIA |
| M16 | Supervisor | "Registra storno" | MEDIA |
| M17 | Staff | "Invia richiesta assenza" | ALTA |
| M18 | Email Settings | "Test SMTP" (aggiorna DB ma NON invia email) | ALTA |
| M19 | Owner super-admin | "Test SMTP" (stesso problema) | ALTA |
| M20 | Dashboard | Quick actions disabled | BASSA |
| M21 | Sala Fullscreen | Riepilogo ordine (bug lookup) | ALTA |

### 2.3 Sezioni PLACEHOLDER (solo testo, non interazione)

- P1 Hotel Keycards - Card "Layer integrazione serrature"
- P2 Hotel Folio - Card "Metodi pagamento finali"
- P3 Archivio - Tab "Fatture in entrata / da cassa"
- P4 Table Actions Modal - Menu casa / giorno / fuori menu / Ordine bevande / Nota
- P5 Stripe UI - Prezzi hardcoded 49/490, storico importo=0
- P6 WebSocket - intera pagina (banner mock dichiarato)
- P7 Sessions - intera pagina (banner mock dichiarato)
- P8 Hardware - intera pagina (banner mock dichiarato)
- P9 QR Tables - banner ma tavoli e token reali

### 2.4 Bug funzionali latenti

- F1 `sala-fullscreen-page.tsx` overlay ordine mostra sempre "Nessun ordine attivo" (chiave mappa vs id tavolo)
- F2 `chiusura-page.tsx` "Aggiorna chiusura" ha `return` early se gia chiusa
- F3 `hotel-folio-page.tsx` lookup ospite usa `stayId` come reservationId (sbagliato: Stay e Reservation separati)
- F4 `hotel-rooms-page.tsx` `stays = useMemo(() => [], [])` hardcoded vuoto, calendario disponibilita fuori sync
- F5 `hotel-reservations-page.tsx` reset form con date fisse 2026-04-15 / 2026-04-17
- F6 `warehouse-context.tsx::dischargeForOrder` non allinea scarico ingredienti via API (ridondante, lo scarico reale e lato `/api/orders/[id]/status`)

### 2.5 RBAC drift (3 fonti di verita in conflitto)

Middleware (`API_ROLE_RULES`) vs handler (`*_ROLES` hardcoded) vs UI (`visibleFor` nav):

| Area | Middleware | Handler | Drift |
|------|-----------|---------|-------|
| `/api/staff` | sup/owner/sa | + `staff` | `staff` mai passa middleware |
| `/api/catering` | owner/sa/sup | + sala/cassa | sala/cassa bloccati |
| `/api/menu` | cucina/sup/owner/sa | + sala/cassa | stesso |
| `/api/tables`, `/api/rooms` | sala/sup/owner/sa | + cassa | cassa bloccato |
| `/api/purchase-orders`, `/api/suppliers` | magazzino/sup/owner/sa | + cassa | cassa bloccato |
| `/api/integration` | reception/hotel_mgr/cassa/sala/owner/sa | + supervisor | supervisor bloccato |
| `/api/reports` | owner/sa/sup/cassa | + hotel_mgr/reception | bloccati |
| `/api/hotel/*` | spesso +supervisor | molti senza | 403 handler dopo ok middleware |

`auth-context.tsx::hasRole()` ritorna sempre `true` per owner/super_admin lato client -> UI puo sovrastimare permessi vs server.

Route senza RBAC ruolo (solo auth):
- `/api/health/ai` espone metadati config OpenAI a qualsiasi loggato
- `/api/auth/*`, `/api/health/*` (accettabile salvo ai)

### 2.6 Dir route vuote (gitkeep)

10 dir senza page.tsx, non linkate dalla nav (da rimuovere o riempire):
`billing`, `branches`, `analytics`, `kitchen`, `menu`, `orders`, `reservations`, `restaurants`, `settings`, `tables`.

## 3) Roadmap Esecutiva Aggiornata

### P0 - Fix user-facing (questa settimana)

Quick wins che fanno sembrare il prodotto "finito" al cliente:

- [ ] B1 Hotel "Nuova prenotazione" header: onClick scroll al form
- [ ] B2 Sala Fullscreen "Esci fullscreen": router.back / exitFullscreen
- [ ] F1 Sala Fullscreen overlay ordine: fix lookup chiave
- [ ] F2 Chiusura Z "Aggiorna chiusura": rimuovere early return
- [ ] F3 Hotel Folio "Ospite": fix join Stay -> Reservation
- [ ] B3 Archivio Comande "Esporta CSV": implementazione CSV client-side
- [ ] B5 Staff "Modifica": apertura form pre-compilato
- [ ] M13 Daily Menu toggle "Menu attivo": persistere su `DailyDish.active` via menuApi
- [ ] B4 Customers "AI Insights": collegare a AiChat con contesto CRM
- [ ] M2 Chiusura Z "Esporta PDF": implementare vero PDF via `@react-pdf/renderer` gia in deps

### P0 - Critical gaps prodotto (questa settimana)

- [ ] M5 Sessions reali: schema `SessionRecord` + API `GET/DELETE /api/sessions`
- [ ] M8 HACCP reale: schema `HaccpLog` + API CRUD + UI
- [ ] M17 Staff richiesta assenza: schema `StaffAbsenceRequest` + API + workflow approvazione
- [ ] M18/M19 Test SMTP: usare nodemailer nel `testEmailConfig` per invio reale
- [ ] Chiudere catalogo prezzi Stripe live (prodotti/prezzi definitivi), validare mapping per piano
- [ ] E2E reale flusso billing (checkout -> webhook -> Tenant.plan/features/seats -> portal)
- [ ] Configurare `OPS_ALERT_WEBHOOK_URL` in deploy e verificare alert su errori critici

### P0 - RBAC + Security finale

- [ ] Unificare RBAC in matrice unica (rimuovere costanti `*_ROLES` hardcoded dai route handler, derivare da `API_ROLE_RULES`)
- [ ] Chiudere 9 drift middleware/handler identificati in sezione 2.5
- [ ] Aggiungere RBAC ruolo a `/api/health/ai` (restringere a super_admin + owner)
- [ ] `hasRole()` client: rispettare lista ruoli richiesta (non bypass automatico per owner)
- [ ] Rimuovere 10 dir route vuote (`.gitkeep`-only)

### P1 - Operativita Completa Business

- [ ] M1 Cassa: chiusura conto reale (pagamento + update ordine + archiviazione) + stampa termica o PDF ricevuta
- [ ] M3 Chiusura Z "Aggiorna chiusura" con note post-chiusura
- [ ] M11 Asporto calcolatore preventivo -> API
- [ ] M12 Catering calcolatore -> API (salvataggio preventivo su `CateringEvent`)
- [ ] M14 Magazzino lista spesa: persistenza su DB (nuova tabella `ShoppingListItem`)
- [ ] M4 Dev Access azioni (sblocca/reset/cache/logout all): endpoint reali per superadmin
- [ ] M16 Supervisor "Registra storno": schema `OrderRefund` + API
- [ ] F4 Hotel calendario disponibilita: usare stays reali da DB invece di useMemo([])
- [ ] F5 Hotel reset form date: usare `todayIso()`
- [ ] M9 Cucina "Turni cucina Aggiungi": collegare a `staffApi.listShifts` + clock
- [ ] Forecasting + grafici manageriali avanzati (raffinamento modello)
- [ ] Fiscale/documentale reale (ricevute/fatture, integrazione provider fiscale)
- [ ] Hotel integrazione hardware reale (adapter vendor serrature Salto/VingCard/Dormakaba/Onity)
- [ ] Policy cancellazione/no-show con penali
- [ ] Housekeeping board avanzato (SLA/assegnazioni/controlli)

### P1 - VoiceButton reale (M6, M7)

- [ ] Integrazione Web Speech API o provider esterno per comandi vocali
- [ ] Routing comandi su API operative (es. "aggiungi 5 kg farina" -> warehouseApi.load)

### P2 - Qualita Enterprise / Scalabilita

- [ ] Test automation:
  - Unit test repository/core
  - Integration test API critiche
  - E2E percorsi chiave (login, ordine con corsi, scarico magazzino, room charge, check-out + folio settlement, clock-in/out staff, checkout Stripe)
- [ ] CI/CD robusta:
  - Gate lint/type/test/build obbligatorio
  - Migrazioni verificate su staging prima di prod
  - Rollback strategy esplicita
- [ ] Observability avanzata:
  - Metriche applicative
  - Alerting uptime/performance
  - Dashboard ops
- [ ] Performance:
  - Rate limiting persistente (fatto: `rate_limit.ts`)
  - Ottimizzazione query/report pesanti
  - Caching selettivo KPI
- [ ] WebSocket server reale (P6 eliminato)

## 4) Checklist Finale "Pronto a Vendere"

Per dire "finito al 100%" devono risultare tutti `DONE`:

- [x] Moduli ristorante reali su DB
- [x] Moduli hotel reali su DB
- [x] Integrazione hotel+ristorante reale su DB (bug F3 residuo)
- [x] KPI e report da dati persistenti
- [x] Superadmin operativo reale
- [x] Password hashing production-grade
- [ ] Session invalidation/refresh completa (codice OK ma Sessions UI e mock - M5)
- [ ] Stripe live + webhook + enforcement licenze (codice OK, manca e2e live + catalogo definitivo)
- [ ] Fiscale/documentale reale
- [x] Backup/restore verificati
- [ ] Monitoring/alerting produzione (baseline OK, da configurare in deploy)
- [ ] Test automatici estesi + CI gate completo (1 smoke, gate parziale)
- [ ] Forecasting e comparazione grafica avanzata (baseline OK, modello semplice)
- [x] Runbook operativo base + documentazione go-live (`docs/RUNBOOK_GO_LIVE.md`)
- [ ] Zero bottoni BROKEN/MOCK user-facing (attuali: 8 BROKEN + 21 MOCK)
- [ ] HACCP reale (requisito operativo)
- [ ] Cassa flusso chiusura reale (M1)

## 5) Stima Completamento Onesta (post-audit 2026-04-21)

Stato complessivo piattaforma: **~94%** (precedente dichiarato ~99%)

Breakdown realistico:

- Core prodotto (DB/API/repository): **96%**
- UI operativita (senza bug e senza mock): **85%**
- Security production-grade (hash/session/rbac): **88%** (drift RBAC da chiudere)
- Billing/licenze live: **89%** (codice OK, catalogo e E2E da chiudere)
- Qualita enterprise (test/obs/backup): **72%**
- Go-to-market readiness: **80%**

Il gap reale per arrivare a 100% e dominato da:

1. 29 bottoni BROKEN/MOCK user-facing (fanno sembrare il prodotto incompleto)
2. 6 bug funzionali latenti (F1-F6)
3. 9 drift RBAC middleware/handler
4. 3 gap prodotto "dichiarati" (Sessions, HACCP, Test SMTP)
5. Chiusura commerciale Stripe (catalogo prezzi + E2E live)

## 6) Piano Esecutivo Consigliato (ordine esatto)

1. **Sprint Quick Wins (2-3h)**: chiudere 10 fix lampo del gruppo P0 user-facing.
2. **Sprint Critical Gaps (1-2 giorni)**: Sessions, HACCP, SMTP reale.
3. **Sprint RBAC Cleanup (mezza giornata)**: matrice unica + chiusura drift.
4. **Sprint Cassa Real (1 giorno)**: flusso chiusura completo + stampa.
5. **Sprint Stripe Live (mezza giornata)**: catalogo + E2E reale.
6. **Sprint Observability Go-Live (mezza giornata)**: config `OPS_ALERT_WEBHOOK_URL`, test alert.
7. **Sprint Test Automation (2-3 giorni)**: coverage percorsi critici + CI gate completo.
8. **Sprint Fiscale (aperto)**: integrazione provider.
9. **Pilot cliente reale controllato**.
10. **Go-live commerciale**.

## 7) Nota Operativa

Le basi applicative sono solide e persistenti al 96%. Il tratto finale non e piu "costruire moduli", ma chiudere in modo professionale:

- eliminazione di tutti i bottoni fake user-facing,
- sicurezza rigorosa (RBAC unificato),
- monetizzazione live end-to-end,
- affidabilita operativa misurata,
- qualita enterprise con test e monitoring.

## 8) Cose da Fare Immediate (questa settimana)

### P0 user-facing (fix lampo, 2-3h totali)
- [ ] B1, B2, B3, B4, B5, F1, F2, F3, M13, M2

### P0 critical (1-2 giorni)
- [ ] M5 Sessions reali
- [ ] M8 HACCP reale
- [ ] M18/M19 SMTP reale
- [ ] Catalogo prezzi Stripe definitivo
- [ ] E2E billing live
- [ ] `OPS_ALERT_WEBHOOK_URL` deploy

### P0 security (mezza giornata)
- [ ] RBAC matrice unica + 9 drift chiusi
- [ ] Rimozione 10 dir route vuote

### P1 prossimo sprint
- [ ] M1 Cassa flusso reale
- [ ] Test automatici percorsi critici + CI gate completo
- [ ] Runbook incident response
- [ ] Monitoraggio produzione con metriche e soglie

### P2 stabilizzazione
- [ ] Fiscale/documentale reale
- [ ] Forecasting avanzato
- [ ] Hotel hardware serrature
- [ ] Pilot cliente controllato
