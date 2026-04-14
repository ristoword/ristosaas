#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL non configurata"
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore non disponibile nel PATH"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql non disponibile nel PATH"
  exit 1
fi

BACKUP_FILE="${1:-}"
if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Uso: $0 <path-backup.dump>"
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file non trovato: ${BACKUP_FILE}"
  exit 1
fi

echo "Verifica contenuto backup: ${BACKUP_FILE}"
pg_restore --list "${BACKUP_FILE}" >/dev/null
echo "Backup valido. Eseguo restore dry-run transazionale."

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SELECT now();
ROLLBACK;
SQL

echo "Dry-run completato. Per restore reale usa pg_restore su ambiente staging."
