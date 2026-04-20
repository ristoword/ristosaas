# E2E — Playwright

Questa cartella contiene test end-to-end Playwright.

## Smoke (no DB richiesto)

- `smoke.spec.ts` copre solo: health endpoint, render login page,
  pagina manutenzione raggiungibile.

## Esecuzione locale

1. Installa browser Playwright una volta:
   ```bash
   pnpm --filter web exec playwright install --with-deps chromium
   ```
2. Build e start dell'app su porta dedicata (evita collisioni con dev):
   ```bash
   pnpm --filter web build
   pnpm --filter web e2e
   ```
3. Se un server è già in ascolto sulla porta, puoi riusarlo:
   ```bash
   E2E_REUSE_SERVER=1 E2E_BASE_URL=http://localhost:3000 pnpm --filter web e2e
   ```

## Test full-stack (login → ordine → magazzino → chiusura)

Richiedono database reale con seed. Lavorali contro Railway staging o un
Postgres locale con `pnpm --filter web prisma:seed`. Non sono attivi nel CI
pubblico perché richiederebbero segreti DB.
