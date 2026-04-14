# RistoSaaS Platform - Project Status and Final Roadmap

Ultimo aggiornamento: 2026-04-14

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

2. **Sicurezza sessione**
   - Rotazione/invalidazione sessioni (token version o session table).
   - Opzionale refresh token con revoca.
   - Policy durata sessioni per ruolo.

3. **RBAC granulare finale**
   - Permission matrix centralizzata per endpoint sensibili.
   - Distinzione completa `owner` vs `super_admin` vs operativi.
   - Audit su pagine/azioni interne.

4. **Billing/licenze live**
   - Stripe prodotti/prezzi reali.
   - Webhook firmati e idempotenti.
   - Enforcement automatico piano/feature/seats.

5. **Backup + disaster recovery**
   - Backup automatici DB.
   - Test restore periodico.
   - Procedura incidente documentata.

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
    - Error tracking (es. Sentry).
    - Logging strutturato centralizzato.
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
- [ ] Session invalidation/refresh completa
- [ ] Stripe live + webhook + enforcement licenze
- [ ] Fiscale/documentale reale
- [ ] Backup/restore verificati
- [ ] Monitoring/alerting produzione
- [ ] Test automatici estesi + CI gate completo
- [ ] Forecasting e comparazione grafica avanzata (modellistica avanzata)
- [ ] Runbook operativo + documentazione go-live

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

Stato complessivo piattaforma: **~91%**

- Core prodotto: 92%
- Operativita restaurant/hotel/integration: 90%
- Security production-grade: 79%
- Billing/licenze live: 55%
- Qualita enterprise (test/obs/backup): 60%
- Go-to-market readiness: 79%

## 6) Nota Operativa

Le basi applicative sono ora solide e persistenti. Il tratto finale per il 100% non e piu "costruire moduli", ma chiudere in modo professionale:

- sicurezza,
- monetizzazione live,
- affidabilita operativa,
- qualità enterprise.
# RistoSaaS Platform - Stato Attuale e Roadmap Completa

## Stato Attuale

Il progetto e arrivato a una base piattaforma multi-verticale con:

- `core comune`
- `verticale restaurant`
- `verticale hotel`
- `layer integration`
- `tenant plan`
- `feature gating`
- `auth centralizzata`
- `JWT session`
- `RBAC iniziale`
- `dashboard unificata`
- `i18n / i10n base`
- `Prisma + schema PostgreSQL iniziale`

## Architettura Attuale

### Core

Gestito dentro:

- `apps/web/src/core/`
- `apps/web/src/lib/auth/`
- `apps/web/src/lib/store/`
- `apps/web/src/db/schema.ts`

Copre:

- autenticazione
- ruoli
- tenant plan
- feature flags
- clienti
- pagamenti base
- folio integration
- impostazioni globali
- internazionalizzazione base
- base ORM PostgreSQL pronta

### Verticale Restaurant

Gia presenti:

- sale
- tavoli
- ordini
- cucina
- cassa
- menu
- magazzino
- fornitori
- catering
- prenotazioni ristorante

### Verticale Hotel

Gia presenti:

- hotel dashboard
- camere
- disponibilita camere
- CRUD camere base
- CRUD prenotazioni base
- check-in / check-out
- housekeeping
- keycard
- guest folio
- room charge
- checkout con chiusura folio
- tassa di soggiorno
- metodi pagamento base nel checkout

### Integration

Gia presenti:

- room charge ristorante -> camera
- guest folio
- conto unico ospite
- dashboard integration
- report unificati base in supervisor

## Pacchetti Commerciali Supportati

Attualmente supportati a livello architetturale:

- `restaurant_only`
- `hotel_only`
- `all_included`

Gestiti tramite:

- `NEXT_PUBLIC_PRODUCT_PLAN`
- tenant feature gating
- sidebar/dashboard/menu condizionali
- middleware con vertical gating

## Dove Siamo Arrivati Davvero

### Gia funzionante

- login demo e sessione JWT
- menu dinamico per ruolo e verticali
- dashboard modulare
- pagine hotel separate
- room charge operativo
- guest folio operativo
- checkout con chiusura conto hotel
- report cross hotel + ristorante
- build produzione OK

### Non ancora reale al 100%

- dati ancora in-memory
- schema DB pronto ma non ancora migrato su database reale
- niente persistenza vera
- niente webhook reali
- niente Stripe live operativo
- niente fatturazione reale
- niente encoder serrature reale
- niente motore booking live
- niente payment processing reale
- niente audit/compliance completo

---

## Roadmap Completa Fino a Prodotto Reale e Vendibile

## Fase 1 - Consolidamento piattaforma

### Obiettivo

Pulire e rendere coerente il layer core per sostenere crescita reale.

### Da fare

- completare `i18n` in tutti i moduli
- completare `i10n` per tutte le date/valute/numeri
- centralizzare permission matrix
- introdurre `tenant context` completo lato frontend e backend
- formalizzare `feature flags` per ogni modulo
- uniformare naming tra `restaurant`, `hotel`, `integration`
- introdurre validazione input con `zod`
- uniformare error handling API

### Output atteso

- core pulito
- permessi chiari
- basi multi-tenant consistenti

---

## Fase 2 - Ristorante realistico

### Obiettivo

Portare il verticale restaurant a livello quasi production.

### Da fare

- CRUD completo ordini
- stato ordine piu robusto
- gestione conti e chiusure tavolo reali
- stampa/queue gestione hardware piu seria
- migliorare cassa e storni
- legare meal plans hotel al consumo restaurant
- anagrafica cliente unica realmente condivisa
- pagamento conto con metodi pagamento formalizzati
- storico contabile piu forte

### Output atteso

- modulo restaurant vendibile anche standalone

---

## Fase 3 - Hotel realistico

### Obiettivo

Portare il verticale hotel a livello PMS base reale.

### Da fare

- planner mensile camere
- rate plans
- availability engine per data / tipo camera
- edit/delete completo camere
- edit/delete completo prenotazioni
- gestione ospiti multipli nello stesso soggiorno
- documenti ospite
- no-show e cancellazioni con policy
- tassa soggiorno configurabile per comune
- housekeeping board tipo kanban
- chiavi / keycard come modulo integrabile

### Output atteso

- modulo hotel vendibile standalone

---

## Fase 4 - Integrazione reale hotel + ristorante

### Obiettivo

Fare la parte piu forte del prodotto.

### Da fare

- charge restaurant su room dal ristorante
- meal plans effettivi:
  - room only
  - B&B
  - half board
  - full board
- colazione inclusa / esclusa
- pacchetti soggiorno + pasti
- conto unico ospite
- saldo unico front desk
- report unificati hotel + restaurant
- vista reception consumi ospite
- vista ristorante ospite interno
- regole di addebito automatizzate

### Output atteso

- vero valore differenziante di mercato

---

## Fase 5 - Database reale

### Obiettivo

Sostituire completamente lo stato in-memory.

### Da fare

- scegliere ORM (`Prisma` o `Drizzle`)
- Prisma introdotto nel progetto
- introdurre Postgres
- migrazioni
- seed iniziale
- repository layer
- transazioni per checkout / payment / charge
- backup / restore
- retention dati

### Output atteso

- persistenza reale
- ambiente stabile

### Stato corrente

- `prisma/schema.prisma` creato
- `PrismaClient` configurato
- `DATABASE_URL` aggiunta in `.env.example`
- runtime ancora su store in-memory fino alla migrazione vera

---

## Fase 6 - Sicurezza production

### Obiettivo

Rendere il sistema vendibile e difendibile.

### Da fare

- password hashate
- refresh token / revoche
- session invalidation vera
- rate limit persistente
- audit log
- lockout
- env secrets veri
- hardening middleware
- autorizzazioni granulari per endpoint e pagina

### Output atteso

- base security production-ready

---

## Fase 7 - Billing e licenze reali

### Obiettivo

Passare da demo/licenze finte a prodotto SaaS vero.

### Da fare

- Stripe live products/prices
- tenant subscription
- enforcement piano acquistato
- trial / renew / suspend
- customer portal
- webhook firmati
- licenze per verticali acquistati

### Output atteso

- monetizzazione reale

---

## Fase 8 - Deploy e ambienti reali

### Obiettivo

Stabilizzare staging/production.

### Da fare

- staging environment
- production environment
- dominio custom
- HTTPS
- healthcheck serio
- rollback
- observability
- Sentry/logging/metrics
- backup monitorato

### Output atteso

- prodotto online in modo serio

---

## Fase 9 - Test e qualità

### Obiettivo

Evitare regressioni e rendere il team scalabile.

### Da fare

- unit test core
- integration test API
- e2e su:
  - login
  - ordine
  - room charge
  - checkout hotel
  - folio close
- CI pipeline
- build + test + lint gate

### Output atteso

- qualità controllata

---

## Fase 10 - Go to market

### Obiettivo

Passare a prodotto vendibile e installabile.

### Da fare

- definizione pacchetti commerciali
- onboarding tenant
- setup guidato reale
- documentazione utente
- documentazione tecnica
- runbook incidenti
- materiale commerciale
- pricing per:
  - restaurant
  - hotel
  - all included

### Output atteso

- prodotto vendibile
- rollout clienti pilot

---

## Ordine Corretto di Implementazione Da Adesso

1. completare i18n/i10n nei moduli
2. planner mensile camere
3. rate plans e motore disponibilita
4. meal plans collegati al restaurant
5. checkout/payment piu completi
6. DB reale
7. security hardening
8. billing/licenze reali
9. observability + CI
10. pilot clienti reali

---

## Definizione di "Prodotto Reale e Vendibile"

Il prodotto puo dirsi davvero pronto quando avra:

- DB reale
- auth sicura
- tenant e piani reali
- billing reale
- report reali
- backup
- monitoraggio
- test
- onboarding
- documentazione
- verticali restaurant e hotel stabili
- integrazione hotel+restaurant operativa

---

## Stato Stimato Attuale

- Architettura: 80%
- Verticale Restaurant: 62%
- Verticale Hotel: 68%
- Integrazione Hotel + Restaurant: 58%
- Security production: 30%
- Billing/licenze reali: 20%
- Deploy production robusto: 50%
- Go-live commerciale: 42%

---

## Priorita Assolute Prossime

- seed iniziale su PostgreSQL
- repository Prisma
- prime API reali hotel su DB
- migrazione graduale dallo store in-memory al DB
- billing/licenze reali
- hardening sicurezza

---

## Punto Di Ripartenza Domani

### Stato raggiunto oggi

- Prisma introdotto nel progetto
- `prisma/schema.prisma` creato e valido
- `PrismaClient` pronto
- `apps/web/.env.local` sistemato
- connessione al PostgreSQL pubblico Railway verificata
- snapshot schema attuale DB salvato in:
  - `apps/web/prisma/railway-current.prisma`
- migrazione safe applicata sul DB esistente:
  - mantenute tabelle legacy
  - aggiunte tabelle nuova piattaforma
- build progetto completata con successo

### Tabelle ora presenti nel DB Railway

Legacy:

- `bookings`
- `payments`
- `rooms`
- `tenant_settings`
- `tenants`
- `user`

Nuova piattaforma:

- `Tenant`
- `TenantFeature`
- `User`
- `Customer`
- `HotelRoom`
- `HotelReservation`
- `Stay`
- `HousekeepingTask`
- `GuestFolio`
- `FolioCharge`

### Cosa NON e ancora stato fatto

- API check-in/check-out, housekeeping e keycard ancora su store in-memory
- integrazione room-charge/folio close ancora su store in-memory
- frontend non ancora alimentato al 100% da DB reale (migrazione in corso)
- AI non ancora collegata a provider LLM reale

### Primo task da cui ripartire

1. completato: seed iniziale PostgreSQL per:
   - tenant
   - tenant features
   - utenti
   - clienti
   - camere
   - prenotazioni
   - soggiorni
   - folio + charge iniziale
2. completato: repository Prisma introdotti per:
   - hotel rooms
   - hotel reservations
   - guest folio / folio charges
3. completato: prime API migrate a Prisma:
   - `/api/hotel/rooms`
   - `/api/hotel/reservations`
   - `/api/hotel/availability`
   - `/api/integration/folios`
   - `/api/integration/charges`
4. prossimo step immediato:
   - completato: migrazione `/api/hotel/front-desk/check-in` e `/api/hotel/front-desk/check-out` su Prisma (transazione)
   - completato: migrazione `/api/integration/room-charge` su Prisma con meal-plan credits
   - completato: migrazione `/api/hotel/housekeeping` su DB reale
   - completato: migrazione keycards su DB reale (`HotelKeycard` + `/api/hotel/keycards`)
   - completato: smoke test end-to-end API persistenti (login -> check-in -> room-charge -> check-out -> housekeeping -> keycards)
   - completato: allineamento pagine hotel core a dati live (`dashboard`, `rooms`, `housekeeping`, `keycards`)
   - completato: integrazione OpenAI reale via API server-side (`/api/ai/chat`) e AI attiva su hotel dashboard/front-desk
   - completato: eliminazione dipendenza mock per rate plans con persistenza DB (`HotelRatePlan`) + API `/api/hotel/rate-plans`
   - completato: planner/disponibilita hotel ora alimentato da rate plans persistenti via repository Prisma
   - completato: report unificati hotel+ristorante con endpoint DB reale `/api/reports/unified` e consumo UI supervisor
   - completato: Blocco 1 migrazione warehouse su Prisma (`stock`, `load`, `discharge`, `movements`) con smoke test API reale
   - completato: Blocco 2 migrazione `kitchen/menu` su Prisma (`recipes`, `food-cost`, `menu items`, `daily dishes`) con repository dedicato
   - completato: Blocco 3 migrazione `orders` su Prisma (`orders`, `marcia`, `status`) con scarico magazzino reale su `WarehouseMovement` tipo `scarico_comanda`
   - completato: filtri periodo `from/to` sui KPI unificati in Supervisor (query su `/api/reports/unified`)
   - completato: KPI storici persistenti via `DailyClosureReport` + API `/api/reports/daily` con integrazione Cassa Report tab
   - completato: trend multi-periodo (day/week/month) su report persistenti via endpoint `/api/reports/trends`
   - completato: integrazione trend in `dashboard home`, `owner` e `cassa` con metriche revenue/costi/margine
   - completato: superadmin operativo reale con `superadmin` forzato al cambio password primo accesso + recovery account (sblocco/reset provvisorio)
   - completato: API admin reali per `tenants`, `licenses`, `email-config`, `users` con azioni operative
   - completato: migrazione blocco caricamento `customers` da store in-memory a repository Prisma
  - completato: migrazione blocco operativo core da store in-memory a Prisma per `staff`, `bookings`, `suppliers`, `catering`, `asporto`, `archivio` con API CRUD multi-tenant e RBAC
  - completato: migrazione blocco `rooms` + `tables` da store in-memory a Prisma con API `/api/rooms` e `/api/tables/**` in persistenza reale
  - completato: rimozione totale import `store/store-ext` da tutte le route `apps/web/src/app/api/**`
  - completato: food cost reale da magazzino su ricette/menu (`/api/kitchen/food-cost/:recipeId` + auto `foodCostPct` su menu item da recipe)
  - completato: logica comande per corsi reale (`in_preparazione`/`pronto`/`servito`) con scarico magazzino per singolo corso e prevenzione doppio scarico
  - completato: alert sotto scorta/critico su API magazzino e feedback scarico ordine (`alerts` + soglia minima)
  - completato: login/logout personale persistente via timbrature DB (`StaffShift`, `/api/staff/shifts`, `/api/staff/shifts/clock`)
  - completato: KPI reali supervisor/owner su costi food+staff e ore/turni da dati persistenti
  - completato: auth utenti persistita su Prisma (lockout, must-change-password, unlock/reset temp password admin) senza dipendenza runtime da store in-memory
  - prossimo: comparazione grafica KPI e forecasting semplice su trend storici (proiezione 7/30 giorni) su dati persistenti

