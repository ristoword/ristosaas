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
- niente DB reale
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

- Architettura: 75%
- Verticale Restaurant: 60%
- Verticale Hotel: 55%
- Integrazione Hotel + Restaurant: 45%
- Security production: 25%
- Billing/licenze reali: 20%
- Deploy production robusto: 45%
- Go-live commerciale: 35%

---

## Priorita Assolute Prossime

- planner camere
- rate plans
- meal plan integration
- DB reale
- billing/licenze reali
- hardening sicurezza

