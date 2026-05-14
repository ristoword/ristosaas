# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

RistoSimply is a multi-tenant SaaS restaurant + hotel management system. Only `apps/web` contains real code (Next.js 15 + Prisma + PostgreSQL). Other workspaces (`apps/api`, `apps/worker`, `apps/public-site`, `packages/*`) are empty scaffolds or README-only placeholders.

### Prerequisites

- **Node.js >= 20** (pre-installed via nvm)
- **pnpm 9.15.0** (declared in root `package.json` `packageManager`)
- **PostgreSQL 16** must be running locally

### Database setup (first time only)

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres createdb ristosimply
cd apps/web
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ristosimply npx prisma db push --accept-data-loss
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ristosimply npx prisma migrate resolve --applied "20240101000000_baseline"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ristosimply npx prisma migrate resolve --applied "20260513000000_warehouse_lot_expiry"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ristosimply npx prisma migrate resolve --applied "20260514000000_add_indexes_and_relations"
node prisma/seed.mjs
```

The baseline migration is intentionally empty. For a fresh DB, use `prisma db push` then mark migrations as applied. Do NOT use `prisma migrate deploy` on an empty database.

### Environment variables

Copy `apps/web/.env.example` to `apps/web/.env.local`. Minimum required:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ristosimply`
- `JWT_SECRET` (generate with `openssl rand -hex 32`)
- `SEED_SUPERADMIN_PASSWORD` (min 12 chars, needed for seed)

Prisma CLI reads from `.env` not `.env.local`. Pass `DATABASE_URL` as an env var prefix for Prisma commands, or create a `.env` symlink.

### Common commands

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` (port 3000) |
| Lint | `pnpm --filter web lint` |
| Typecheck | `pnpm --filter web typecheck` |
| Tests | `pnpm --filter web test` |
| E2E tests | `pnpm --filter web e2e` (requires Playwright browsers) |
| Build | `pnpm --filter web build` |
| Seed DB | `cd apps/web && node prisma/seed.mjs` |

### Demo login credentials (from seed)

- `owner` / `owner123` (owner role, full access)
- `superadmin` / value of `SEED_SUPERADMIN_PASSWORD`
- `sala` / `sala123`, `cucina` / `cucina123`, `cassa` / `cassa123`, etc.

### Gotchas

- PostgreSQL must be started manually: `sudo pg_ctlcluster 16 main start`
- The `postinstall` hook in `apps/web` runs `prisma generate` automatically on `pnpm install`
- Build warnings about `runtime` field in twitter-image/opengraph-image routes are cosmetic (Next.js edge runtime recognition issue)
- `next lint` shows a deprecation warning about Next.js 16 — this is informational only
