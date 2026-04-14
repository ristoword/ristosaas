#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL non configurata"
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump non disponibile nel PATH"
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./storage/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
FILENAME="ristosaas_${TIMESTAMP}.dump"
OUTPUT_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "Avvio backup PostgreSQL su ${OUTPUT_PATH}"
pg_dump "${DATABASE_URL}" --format=custom --no-owner --no-privileges --file="${OUTPUT_PATH}"

LATEST_LINK="${BACKUP_DIR}/latest.dump"
ln -sf "${FILENAME}" "${LATEST_LINK}"

# Retention cleanup for timestamped dumps only
find "${BACKUP_DIR}" -type f -name "ristosaas_*.dump" -mtime +"${BACKUP_RETENTION_DAYS}" -delete

echo "Backup completato: ${OUTPUT_PATH}"
echo "Retention applicata: ${BACKUP_RETENTION_DAYS} giorni"
