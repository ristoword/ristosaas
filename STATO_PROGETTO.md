# STATO PROGETTO — RistoSaaS
**Ultimo aggiornamento:** Venerdì 24 Aprile 2026 — 17:14

---

## ✅ FATTO (tutto verificato, pushato, DB aggiornato)

### Infrastruttura & Sicurezza
- [x] **Build Next.js** — 149 route, 0 errori
- [x] **Typecheck** (prod + test) — OK
- [x] **ESLint** — 0 errori, 0 warning
- [x] **23 unit test** — tutti passati
- [x] **CI pipeline** (lint → typecheck → test → build) — OK
- [x] **pnpm audit** — solo PostCSS moderate (build-only, non runtime)
- [x] **Variabili ambiente** — `.env.example` documentato
- [x] **Migration script robusto** — parser SQL corretto (bug commenti `--` risolto)

### Autenticazione & RBAC
- [x] **Login con rate limit** — 10 tentativi/min, blocco account dopo 5 errori
- [x] **JWT + session versioning** — sessioni invalidabili lato server
- [x] **Middleware edge** — verifica token, RBAC, maintenance mode, tenant blocked
- [x] **RBAC centralizzato** — matrice unica `API_ROLE_RULES` in `rbac.ts`
- [x] **mustChangePassword** — blocco API finché non cambia password
- [x] **Guard handler + middleware allineati** — nessun drift (audit 2026-04-21)

### Sala → KDS (cucina / pizzeria / bar)
- [x] **Routing area corretto** — ogni item `OrderItem.area` instrada alla schermata corretta
- [x] **Filtro area nel menu sala** — dropdown "Tutte le aree / Cucina / Pizzeria / Bar"
- [x] **Badge area colorato** — arancio cucina, giallo pizzeria, azzurro bar
- [x] **Note comanda visibili** — `order.notes` mostrato nelle card di cucina/pizzeria/bar (sfondo amber)
- [x] **KDS pizzeria e bar** — usano `courseStates` come cucina (non più `o.status` globale)
- [x] **Portata attiva mostrata** — ogni card mostra "P1", "P2" ecc.

### Menu (ricette / menu del giorno / menu admin)
- [x] **Modifica ricette** — modal completa: nome, prezzo, area, porzioni, FC%, note + **ingredienti modificabili**
- [x] **Modifica menu del giorno** — modal: nome, descrizione, categoria, prezzo, allergeni
- [x] **Modifica piatti (menu admin)** — modal: tutti i campi
- [x] **Trasferimento ricetta → Menu permanente** ✅
- [x] **Trasferimento ricetta → Menu del giorno** ✅
- [x] **Trasferimento menu del giorno → Menu permanente** ✅
- [x] **Trasferimento piatto (menu admin) → Menu del giorno** ✅
- [x] **Input ingredienti — campo "0"** — risolto bug `||""` che impediva di digitare 0
- [x] **Area piatti normalizzata nel DB** — `UPDATE lower(area)` applicato (11 piatti corretti)

### Magazzino
- [x] **Scorte per reparto** — tabella `WarehouseLocationStock` (centrale + CUCINA/PIZZERIA/BAR/SALA/PROPRIETA/ALTRO)
- [x] **Trasferimenti centrale ↔ reparto** — con registrazione movimento
- [x] **Movimenti CRUD** — crea (carico/scarico/trasferimento/rettifica), modifica motivo/nota, lista completa da DB
- [x] **Scarico automatico per reparto** — su "servito"/"chiuso": scarica dal reparto dell'area, fallback su centrale
- [x] **Scarico ingredienti via `menuItemId → recipeId`** — non più matching per nome (fragile)
- [x] **Stock in tempo reale** — polling 30s + evento `warehouse:refresh` dopo `patchStatus`
- [x] **`lowStockItems` e `totalStockValue`** — usano `totalQty` (centrale + reparti), non solo centrale
- [x] **Valore inventario API** — usa `totalQty` (fix bug sottostima)

### Note operative & Turni
- [x] **Note vocali pizzeria** — persistite su DB (`OperationalNote`), con elimina
- [x] **Note vocali bar** — persistite su DB, con elimina
- [x] **Turni cucina** — persistiti su DB (`ShiftPlan`), raggruppati per giorno, con elimina

### Migrations DB (tutte applicate sul DB reale)
- [x] `migrations_railway_to_platform.sql` — migrazione iniziale
- [x] `migrations_add_warehouse.sql` — magazzino base
- [x] `migrations_add_warehouse_locations.sql` — scorte per reparto
- [x] `migrations_add_operational_notes.sql` — note pizzeria/bar
- [x] `migrations_add_shift_plans.sql` — turni cucina
- [x] (+ altre ~20 migration storiche applicate)

---

## 🟡 DA FARE — Priorità media

### 1. Polling ordini KDS
Le schermate cucina/pizzeria/bar **non si aggiornano automaticamente** quando sala manda una nuova comanda. Bisogna ricaricare la pagina.
- **Cosa manca:** polling `ordersApi.list()` ogni 15-20s in `OrdersProvider` (come già fatto per magazzino)
- **File:** `src/components/orders/orders-context.tsx`
- **Impatto:** operativo — i cuochi devono ricaricare per vedere nuove comande

### 2. Alert stock visibile nelle schermate operative
Quando uno scarico manda un ingrediente sotto scorta minima, l'alert è nella risposta API (`discharge.alerts`) ma non viene mostrato a cucina/pizzeria/bar.
- **Cosa manca:** leggere `discharge.alerts` da `patchStatus` e mostrare un toast/banner nella schermata operativa
- **File:** `src/components/orders/orders-context.tsx` + cucina/pizzeria/bar pages
- **Impatto:** operativo — nessuno sa che un ingrediente è esaurito

### 3. Feedback errore visibile (context vuoti)
Se il DB è irraggiungibile, sala/cucina/magazzino mostrano pagine vuote senza messaggio.
- **Cosa manca:** stato `error: string | null` nei context (ordini, menu, magazzino) + banner errore in UI
- **File:** tutti e 3 i context + layout dashboard
- **Impatto:** UX — l'utente non capisce cosa sta succedendo

---

## 🟢 DA FARE — Priorità bassa / futura

### 4. Modifica passi ricetta (steps)
La modal modifica ricetta ha gli ingredienti ma **non i passaggi** (steps). Modificabili solo ricreando la ricetta.
- **Cosa manca:** aggiungere tabella steps alla modal di modifica

### 5. Aggiornamento automatico menu pubblico QR
Il menu QR non si aggiorna se i piatti cambiano senza ricaricare.
- **Cosa manca:** revalidation Next.js o polling client

### 6. Turni per pizzeria e bar
`ShiftPlan` supporta già `area`, ma l'UI esiste solo per cucina.
- **Cosa manca:** aggiungere tab "Turni" in pizzeria-page e bar-page (5 min)

---

## 📊 Commit storia recente (branch `main`)
```
51f1b33  feat: ingredienti modificabili, area piatti normalizzata, turni cucina persistiti
bebb551  feat: note vocali persistite, scarico per recipeId, stock real-time
51c515e  fix(system-check): 3 bug + 7 warning risolti da audit completo
2f3bc55  fix(ricette): campo ingredienti accetta 0 direttamente
edc3c87  feat(menu): modifica in-place e trasferimenti tra ricette, menu del giorno e menu admin
1620a55  fix(scripts): parser SQL migration ignora commenti fuori da blocchi DO
76eba38  feat(warehouse): scorte per reparto, trasferimenti e UI movimenti completa
5d79525  fix(sala-kds): routing comande pizzeria/bar, filtro area menu, note nelle card
e1ae227  feat(hotel): checkout reception con folio reale, pagamenti manuali e validazione
```

---

## 🗄️ DB Schema (modelli principali)
| Modello | Scopo |
|---|---|
| `Tenant` | Multi-tenant principale |
| `User` | Utenti con ruolo |
| `RestaurantOrder` + `RestaurantOrderItem` | Ordini sala con area per item |
| `WarehouseItem` | Prodotti magazzino (qty = centrale) |
| `WarehouseLocationStock` | Scorte per reparto |
| `WarehouseMovement` | Movimenti (carico/scarico/trasferimento/rettifica) |
| `Recipe` + `RecipeIngredient` | Ricette con ingredienti |
| `MenuItem` | Piatti del menu permanente |
| `DailyDish` | Piatti del menu del giorno |
| `OperationalNote` | Note operative pizzeria/bar/cucina/sala |
| `ShiftPlan` | Turni pianificati per reparto |

---

## 🔑 Env richieste (`.env.local`)
```
DATABASE_URL=               # PostgreSQL
JWT_SECRET=                 # minimo 32 char
NEXT_PUBLIC_APP_URL=
STRIPE_SECRET_KEY=          # opzionale per pagamenti QR
STRIPE_WEBHOOK_SECRET=      # opzionale
AI_SCHEDULER_TOKEN=         # per AI proposals/cron
OPENAI_API_KEY=             # per AI chat cucina/magazzino
```
