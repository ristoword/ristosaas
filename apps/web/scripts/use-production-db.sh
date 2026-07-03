#!/usr/bin/env bash
# Ripristina .env.local sul database di PRODUZIONE (solo sezione DB).
set -euo pipefail
cd "$(dirname "$0")/.."
BACKUP=".env.production.db.backup"
ENV=".env.local"
if [[ ! -f "$BACKUP" ]]; then
  echo "Backup produzione non trovato: $BACKUP"
  exit 1
fi
PROD_URL=$(grep '^DATABASE_URL=' "$BACKUP" | cut -d= -f2-)
PROD_HOST=$(grep '^PGHOST=' "$BACKUP" | cut -d= -f2-)
PROD_PORT=$(grep '^PGPORT=' "$BACKUP" | cut -d= -f2-)
PROD_PASS=$(grep '^PGPASSWORD=' "$BACKUP" | cut -d= -f2-)
python3 <<PY
from pathlib import Path
env = Path("$ENV").read_text()
repl = '''# ---------- Database / PostgreSQL (Railway) ----------
DATABASE_URL=$PROD_URL
PGHOST=$PROD_HOST
PGPORT=$PROD_PORT
PGDATABASE=railway
PGUSER=postgres
PGPASSWORD=$PROD_PASS
POSTGRES_DB=railway
POSTGRES_PASSWORD=$PROD_PASS
POSTGRES_USER=postgres'''
import re
out = re.sub(
    r'# ---------- Database / PostgreSQL.*?POSTGRES_USER=postgres',
    repl,
    env,
    count=1,
    flags=re.DOTALL,
)
Path("$ENV").write_text(out)
PY
echo "✓ .env.local collegato a PRODUZIONE ($PROD_HOST)"
