# STATO PROGETTO — RistoSaaS
**Ultimo aggiornamento:** Martedì 17 Giugno 2026 — 10:10

---

## 🏗️ Infrastruttura

| Componente | Stato | Dettagli |
|---|---|---|
| **Hosting** | ✅ Attivo | Railway — `ristosaas-production.up.railway.app` |
| **Database** | ✅ Connesso | PostgreSQL su Railway (`gondola.proxy.rlwy.net:21479`) |
| **Health endpoint** | ✅ 200 OK | `/api/health` → `{"status":"ok","db":"up"}` |
| **Build TypeScript** | ✅ 0 errori | `tsc --noEmit` pulito |
| **Linter** | ✅ 0 errori | Nessun warning su nessun file |
| **ORM** | ✅ Prisma 6.19.3 | Schema sincronizzato con DB (`prisma db push`) |
| **Autenticazione** | ✅ JWT + sessioni | Rate limit login, blocco account, session versioning |
| **RBAC** | ✅ Centralizzato | Matrice `API_ROLE_RULES` in `rbac.ts` — 7 ruoli supportati |

---

## 📊 Dati nel DB di produzione

| Entità | Conteggio |
|---|---|
| Tenant | 8 |
| Utenti | 22 |
| Licenze attive | 8 (tutte `all_included`) |
| Partner/Dealer | 2 (Indonesia, Brasil) |
| Ordini | 21 |
| Piatti menu | 77 |
| Ricette | 60 |
| Prodotti magazzino | 33 |
| Tavoli | 82 |
| Staff | 15 |
| Fornitori | 5 |
| Clienti | 11 |
| Camere hotel | 43 |
| Prenotazioni hotel | 4 |
| Sessioni utente | 670 |

---

## 🌍 Internazionalizzazione (i18n)

| Aspetto | Stato |
|---|---|
| **Lingue supportate** | IT (Italiano), EN (English), NL (Nederlands), PT (Português BR) |
| **Chiavi dizionario** | 1141 per ogni lingua — **tutte allineate** |
| **SEO content** | 6 blocchi per lingua (LOCALE_META, HOMEPAGE, PILLAR, RESTAURANT, BLOG_INDEX, BLOG_POSTS) |
| **Selettore lingua** | Presente in top-bar (desktop) e sidebar footer (mobile) |
| **Pagine coperte** | Tutte le pagine operative e landing — nessun testo hardcoded |
| **Responsive** | Testato — avatar utente sempre visibile, selettore lingua accessibile su mobile |

---

## 📋 MODULI — Stato dettagliato

### 1. 🔐 Autenticazione & Autorizzazione
**Stato: ✅ Completo**

- Login con rate limiting (10 tentativi/min, blocco account dopo 5 errori)
- JWT + session versioning — sessioni invalidabili lato server
- Middleware edge: verifica token, RBAC, maintenance mode, tenant blocked
- `mustChangePassword` — blocco API finché non cambia password
- Ruoli: `owner`, `admin`, `staff`, `waiter`, `receptionist`, `super_admin`, `reseller`
- Pagina cambio password con validazione forte (12+ char, maiuscola, minuscola, numero)

### 2. 📊 Dashboard
**Stato: ✅ Completo**

- Panoramica ordini del giorno, revenue, tavoli attivi
- KPI cards con dati in tempo reale
- Accesso rapido ai moduli principali
- Completamente tradotto in 4 lingue

### 3. 🍽️ Sala (Dining Room)
**Stato: ✅ Completo**

- Gestione tavoli con planimetria visiva
- Creazione ordini con assegnazione area (cucina/pizzeria/bar)
- **Append ordini**: se un tavolo ha già un ordine attivo, i nuovi item vengono aggiunti all'ordine esistente (non ne crea uno nuovo)
- Il tavolo resta "occupato" fino a "Chiedi conto" o "Chiudi tavolo"
- Note comanda visibili
- Filtro area nel menu sala (dropdown tutte/cucina/pizzeria/bar)
- Badge area colorato per item
- Vista fullscreen per tablet
- Modal azioni tavolo (conto, chiudi, sposta)

### 4. 👨‍🍳 Cucina (Kitchen Display)
**Stato: ✅ Completo**

- KDS con card ordini raggruppate per portata
- Flusso: in attesa → in preparazione → pronto → servito
- Aggiornamento corso specifico per portata (non globale)
- Gestione ricette con ingredienti, porzioni, food cost
- Menu del giorno con CRUD completo
- Menu admin permanente
- Trasferimenti ricetta ↔ menu del giorno ↔ menu permanente
- Turni cucina persistiti su DB
- Note operative vocali

### 5. 🍕 Pizzeria KDS
**Stato: ✅ Completo**

- Stesso flusso KDS della cucina, filtrato per area "pizzeria"
- Aggiornamento corso specifico per portata
- Note vocali persistite

### 6. 🍺 Bar KDS
**Stato: ✅ Completo**

- Stesso flusso KDS, filtrato per area "bar"
- Aggiornamento corso specifico per portata
- Note vocali persistite

### 7. 💰 Cassa (Cash Register)
**Stato: ✅ Completo**

- Visualizzazione ordini per tavolo con aggregazione di tutti gli ordini del tavolo
- "Chiudi tavolo" chiude tutti gli ordini associati
- Pagamento online via Stripe (link di pagamento)
- Report giornaliero con revenue filtrato per data corrente
- Error handling robusto su tutte le operazioni
- Chiusura giornaliera con report fiscale

### 8. 🏨 Hotel
**Stato: ✅ Completo**

- **Dashboard**: panoramica occupazione, revenue, check-in/out del giorno
- **Camere**: CRUD completo, stati (libera/occupata/manutenzione/pulizia)
- **Prenotazioni**: CRUD, calendario, gestione disponibilità
- **Front Desk**: check-in/check-out con folio, pagamenti manuali
- **Housekeeping**: task pulizia, assegnazione personale, stato camere
- **Planner**: vista calendario occupazione
- **Room Service**: catalogo, ordini, tracking
- **QR Rooms**: accesso ospite tramite QR
- **Keycards**: gestione chiavi digitali
- **Turni hotel**: pianificazione turni staff hotel

### 9. 📦 Magazzino (Warehouse)
**Stato: ✅ Completo**

- Scorte per reparto (centrale + cucina/pizzeria/bar/sala/proprietà/altro)
- Trasferimenti centrale ↔ reparto con registrazione movimento
- Carico/scarico con validazione quantità positiva
- Scarico automatico ingredienti su "servito" (via `recipeId`)
- Stock real-time con polling 30s
- Equipaggiamento (CRUD con try/catch robusto)
- Lotti e storico costi
- Valore inventario aggregato

### 10. 👥 Staff
**Stato: ✅ Completo**

- Gestione dipendenti CRUD
- Badge digitali con generazione token
- Pagina personale staff (`staff-me`)
- HR: contratti, documenti, presenze
- Timbratura badge (clock in/out)
- Link utente ↔ staff member con error handling

### 11. 📅 Turni (Shifts)
**Stato: ✅ Completo**

- Pianificazione turni per reparto
- Persistiti su DB (`ShiftPlan`)
- Raggruppati per giorno con elimina

### 12. 🚚 Fornitori (Suppliers)
**Stato: ✅ Completo**

- Anagrafica fornitori CRUD
- Ordini di acquisto con PDF generabile
- Archiviazione ordini
- Report acquisti
- Invio ordini via email

### 13. 👤 Clienti (Customers)
**Stato: ✅ Completo**

- Anagrafica clienti CRUD
- Storico ordini per cliente
- 11 clienti registrati

### 14. 👑 Owner (Proprietario)
**Stato: ✅ Completo**

- Dashboard analytics avanzate
- Report vendite, trend, performance
- Panoramica completa attività

### 15. 🔍 Supervisor
**Stato: ✅ Completo**

- Dashboard supervisore
- Gestione storni
- Monitoraggio operativo

### 16. 🌐 Landing / Marketing
**Stato: ✅ Completo**

- Homepage multilingua con SEO ottimizzato (IT/EN/NL/PT)
- Pagine pillar localizzate per slug SEO
- Blog con post multilingua
- Video demo incorporato nella homepage
- Schema.org JSON-LD per software application
- Sitemap e robots.txt

### 17. 🤝 Reseller / Partner (Controllo Vendite)
**Stato: ✅ Completo**

- Pagina `/controllo-vendite` per dealer/reseller
- Visualizza solo i clienti del proprio partner code
- **Pricing multi-piano**: Solo Ristorante (€79, comm. €29) + All Inclusive (€279, comm. €59)
- Statistiche: clienti totali, licenze attive, scadute, commissioni totali
- Tabella dettagliata con prezzo/commissione per piano licenza
- Super admin vede tutti i partner
- Partner attivi: **Indonesia** e **Brasil**

### 18. ⚙️ Super Admin
**Stato: ✅ Completo**

- Gestione tenant (crea/modifica/elimina)
- Gestione licenze (attiva/sospendi/rinnova)
- Creazione tenant con password provvisoria visualizzata + copia
- Partner code assegnabile alla licenza
- Gestione utenti globale

### 19. 🤖 AI Assistente
**Stato: ✅ Funzionante**

- Chat AI per cucina/magazzino
- Proposte AI con scheduling giornaliero
- Applicazione proposte automatiche

### 20. 📧 Email & Notifiche
**Stato: ✅ Funzionante**

- Configurazione SMTP per tenant
- Template email personalizzabili
- Sistema notifiche in-app con mark as read

### 21. 🏷️ Moduli aggiuntivi

| Modulo | Stato |
|---|---|
| **Prenotazioni ristorante** | ✅ Funzionante |
| **Asporto / Takeaway** | ✅ Funzionante |
| **Catering** | ✅ Funzionante |
| **HACCP** | ✅ Funzionante |
| **QR Tables** (menu digitale) | ✅ Funzionante |
| **Hardware** (stampanti, POS) | ✅ Funzionante |
| **Archivio ordini** | ✅ Funzionante |
| **Archivio fiscale** | ✅ Funzionante |
| **Food Cost** | ✅ Funzionante |
| **Stripe Billing** | ✅ Funzionante |
| **Ricerca globale** | ✅ Funzionante |

---

## 🗄️ DB Schema — Modelli principali (63 modelli)

| Modello | Scopo |
|---|---|
| `Tenant` | Multi-tenant principale |
| `User` + `UserSession` | Utenti con ruolo e sessioni |
| `TenantLicense` | Licenze per tenant con partner code |
| `Partner` | Dealer/reseller (Indonesia, Brasil) con pricing multi-piano |
| `RestaurantOrder` + `RestaurantOrderItem` | Ordini sala con area per item |
| `MenuItem` + `DailyDish` | Menu permanente + menu del giorno |
| `Recipe` + `RecipeIngredient` + `RecipeStep` | Ricette con ingredienti e passaggi |
| `WarehouseItem` + `WarehouseLocationStock` + `WarehouseMovement` | Magazzino completo |
| `WarehouseEquipment` + `WarehouseLot` + `WarehouseCostHistory` | Equipaggiamento e lotti |
| `HotelRoom` + `HotelReservation` + `Stay` + `GuestFolio` | Hotel completo |
| `HotelRatePlan` + `HousekeepingTask` + `HotelKeycard` | Tariffe, pulizie, chiavi |
| `FolioCharge` + `RoomServiceCatalogItem` + `RoomServiceOrder` | Addebiti e room service |
| `StaffMember` + `StaffShift` | Staff e presenze |
| `ShiftPlan` + `OperationalNote` | Turni e note operative |
| `Supplier` + `PurchaseOrder` + `PurchaseOrderItem` | Fornitori e ordini acquisto |
| `Customer` | Anagrafica clienti |
| `Booking` | Prenotazioni ristorante |
| `CateringEvent` | Eventi catering |
| `TakeawayOrder` | Ordini asporto |
| `ArchivedOrder` + `ArchivedSupplierOrder` | Archivi |
| `DailyClosureReport` | Chiusure giornaliere |
| `RestaurantRoom` + `RestaurantTable` | Sale e tavoli |
| `HaccpEntry` | Registri HACCP |
| `HardwareDevice` + `PrintRoute` | Dispositivi e stampa |
| `SupervisorStorno` | Storni supervisor |
| `AiChatLog` + `AiProposal` | AI assistant |
| `EmailLog` + `EmailTemplate` + `TenantEmailConfig` | Sistema email |
| `Notification` | Notifiche in-app |
| `BillingSubscription` + `BillingEvent` | Stripe billing |
| `ArchivioFiscalStub` | Documenti fiscali |

---

## 🔢 Numeri del progetto

| Metrica | Valore |
|---|---|
| Pagine (route) | **78** |
| API routes | **151** |
| Modelli DB | **63** |
| Chiavi i18n per lingua | **1141** |
| Lingue supportate | **4** (IT, EN, NL, PT) |
| File sorgente modificati (ultimo commit) | **50** |

---

## 🔑 Env richieste (`.env.local`)
```
DATABASE_URL=               # PostgreSQL connection string
JWT_SECRET=                 # minimo 32 char
NEXT_PUBLIC_APP_URL=        # URL produzione
STRIPE_SECRET_KEY=          # per pagamenti QR e billing
STRIPE_WEBHOOK_SECRET=      # webhook Stripe
AI_SCHEDULER_TOKEN=         # per AI proposals/cron
OPENAI_API_KEY=             # per AI chat cucina/magazzino
```

---

## 🟡 DA FARE — Possibili implementazioni future

### Priorità alta
1. **Pagine marketing PT**: aggiungere route `/pt` e `/pt/<slug>` come `/en` e `/nl` per SEO portoghese
2. **Aggiornamento automatico menu QR**: revalidation Next.js o polling client sul menu pubblico
3. **Dashboard analytics avanzate**: grafici trend settimanali/mensili, confronto periodi
4. **Export dati**: PDF/Excel per report chiusure, magazzino, staff HR

### Priorità media
5. **PWA / App mobile**: manifest.json, service worker per installazione su dispositivi
6. **Notifiche push**: web push notifications per ordini pronti, stock basso
7. **Multi-valuta**: supporto prezzi in valute diverse per partner internazionali (IDR, BRL)
8. **Integrazione fiscale**: collegamento RT (registratore telematico) per scontrini Italia
9. **Prenotazioni online**: widget embeddabile per sito cliente con calendario disponibilità
10. **Loyalty program**: sistema punti/fidelity per clienti ricorrenti

### Priorità bassa
11. **Apple Store / Google Play**: wrapper PWA con Capacitor.js o React Native WebView
12. **API pubblica**: documentazione OpenAPI per integrazioni terze parti
13. **Multi-sede**: gestione catene con dashboard aggregata
14. **Marketplace ricette**: condivisione ricette tra tenant
15. **Backup automatico**: scheduled backup DB con retention policy

---

## 📊 Commit storia recente (branch `main`)
```
f87aea5  feat: i18n completo PT, bug fix globali, ordini sala append, pricing multi-piano partner
70a6f58  feat(i18n+responsive): full nav/topbar translations IT/EN/NL, user menu always visible on mobile
a6db96e  feat(super-admin): show temp password and copy buttons in tenant creation success screen
7078c8a  fix(middleware): allow public video files (webm, mp4, ogg) without auth
8208b1b  feat(landing): add demo video section below hero
087601b  fix(super-admin): fix UserRole type to include reseller; fix password validation
```

---

**Prossimo controllo pianificato:** alla prossima sessione di sviluppo.
