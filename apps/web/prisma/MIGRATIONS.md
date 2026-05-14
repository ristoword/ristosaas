# Gestione delle migrazioni database

## Schema attuale

Lo schema è definito interamente in `prisma/schema.prisma`.  
Le migrazioni vengono gestite con **Prisma Migrate** a partire dalla baseline `20240101000000_baseline`.

---

## Setup su ambiente ESISTENTE (Railway, staging, dev locale)

Il database ha già lo schema completo applicato tramite gli script SQL ad hoc (`migrations_*.sql`).  
Occorre solo registrare la baseline come già applicata **senza rieseguire la DDL**:

```bash
pnpm prisma:baseline
# equivale a: prisma migrate resolve --applied 20240101000000_baseline
```

Dopodiché il database è allineato con Prisma Migrate e pronto a ricevere nuove migrazioni con `prisma migrate deploy`.

---

## Setup su ambiente NUOVO (greenfield)

La baseline è intenzionalmente vuota (il DDL storico è nei file `migrations_*.sql`).
Per un database nuovo, usa `prisma db push` per creare lo schema, poi marca le
migrazioni come già applicate:

```bash
# 1. Crea il database PostgreSQL e imposta DATABASE_URL in .env
# 2. Crea lo schema completo da schema.prisma
DATABASE_URL=... npx prisma db push --accept-data-loss
# 3. Marca le migrazioni come applicate (NON usare migrate deploy su DB vuoto)
DATABASE_URL=... npx prisma migrate resolve --applied "20240101000000_baseline"
DATABASE_URL=... npx prisma migrate resolve --applied "20260513000000_warehouse_lot_expiry"
DATABASE_URL=... npx prisma migrate resolve --applied "20260514000000_add_indexes_and_relations"
# 4. Genera il client Prisma
pnpm prisma:generate
# 5. Esegui il seed (opzionale)
pnpm prisma:seed
```

> **Nota:** `prisma migrate deploy` su un database vuoto non funziona perché la
> baseline è vuota. Usare sempre `db push` + `migrate resolve` per ambienti nuovi.

---

## Creare una nuova migrazione

```bash
# Modifica prisma/schema.prisma, poi:
pnpm prisma:migrate:dev --name <descrizione_in_snake_case>
# Esempio:
pnpm prisma:migrate:dev --name add_invoice_table
```

Questo crea un nuovo file in `prisma/migrations/<timestamp>_<nome>/migration.sql`,  
lo applica al DB locale e aggiorna il Prisma Client.

---

## Deploy in produzione

```bash
pnpm prisma:migrate:deploy
```

Applica solo le migrazioni non ancora registrate nella tabella `_prisma_migrations`.  
**Non** esegue la baseline se già marcata con `prisma:baseline`.

---

## File SQL ad hoc (legacy)

I file `migrations_*.sql` nella cartella `prisma/` sono la storia delle migrazioni  
applicate manualmente prima dell'adozione di Prisma Migrate.  
**Non vanno più eseguiti.** Vengono mantenuti solo come riferimento storico.

---

## Regola d'oro

> **Mai modificare `schema.prisma` senza creare la relativa migrazione.**  
> Mai applicare SQL manuale in produzione senza creare prima il file di migrazione.
