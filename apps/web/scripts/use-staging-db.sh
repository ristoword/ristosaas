#!/usr/bin/env bash
# Collega .env.local al database STAGING (test).
set -euo pipefail
cd "$(dirname "$0")/.."
STG=".env.staging"
ENV=".env.local"
if [[ ! -f "$STG" ]]; then
  echo "Manca $STG"
  exit 1
fi
STG_URL=$(grep '^DATABASE_URL=' "$STG" | cut -d= -f2-)
# parse host:port from URL
STG_HOST=$(echo "$STG_URL" | sed -E 's|.*@([^:/]+):([0-9]+)/.*|\1|')
STG_PORT=$(echo "$STG_URL" | sed -E 's|.*@([^:/]+):([0-9]+)/.*|\2|')
STG_PASS=$(echo "$STG_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
python3 <<PY
from pathlib import Path
import re
env = Path("$ENV").read_text()
repl = '''# ---------- Database / PostgreSQL (Railway STAGING — test) ----------
# Produzione: vedi .env.production.db.backup
DATABASE_URL=$STG_URL
PGHOST=$STG_HOST
PGPORT=$STG_PORT
PGDATABASE=railway
PGUSER=postgres
PGPASSWORD=$STG_PASS
POSTGRES_DB=railway
POSTGRES_PASSWORD=$STG_PASS
POSTGRES_USER=postgres'''
out = re.sub(
    r'# ---------- Database / PostgreSQL.*?POSTGRES_USER=postgres',
    repl,
    env,
    count=1,
    flags=re.DOTALL,
)
Path("$ENV").write_text(out)
PY
echo "✓ .env.local collegato a STAGING ($STG_HOST:$STG_PORT)"
