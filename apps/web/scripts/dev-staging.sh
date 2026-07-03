#!/usr/bin/env bash
# Avvia RistoSimply usando il DB staging (.env.staging) senza toccare produzione.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.staging ]]; then
  echo "Crea apps/web/.env.staging da .env.staging.example con la DATABASE_URL staging."
  exit 1
fi

STAGING_URL=$(grep '^DATABASE_URL=' .env.staging | cut -d= -f2-)
if [[ -z "$STAGING_URL" ]]; then
  echo "DATABASE_URL mancante in .env.staging"
  exit 1
fi

# Blocco accidentale su produzione nota
if echo "$STAGING_URL" | grep -qE 'gondola\.proxy\.rlwy\.net:21479'; then
  echo "ERRORE: .env.staging punta al host di PRODUZIONE. Usa il DB staging Railway."
  exit 1
fi

echo "→ Avvio con database STAGING (produzione non modificata)"
export DATABASE_URL="$STAGING_URL"
# Carica il resto delle variabili da .env.local senza sovrascrivere DATABASE_URL
if [[ -f .env.local ]]; then
  set -a
  # shellcheck source=/dev/null
  source <(grep -v '^DATABASE_URL=' .env.local | grep -v '^PG' | grep -v '^POSTGRES_')
  set +a
  export DATABASE_URL="$STAGING_URL"
fi

exec pnpm exec next dev -p "${PORT:-3001}"
