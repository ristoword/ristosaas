# Backup and Disaster Recovery

## Obiettivo

Garantire backup periodici PostgreSQL e verifica ripristino senza interrompere il servizio.

## Prerequisiti

- `DATABASE_URL` valorizzata con credenziali corrette.
- Tool installati localmente o nel runner:
  - `pg_dump`
  - `pg_restore`
  - `psql`

## Script disponibili

- Backup:
  - `infra/scripts/db-backup.sh`
- Verifica restore (dry-run):
  - `infra/scripts/db-restore-dryrun.sh <path-backup.dump>`
- Comandi rapidi root:
  - `pnpm db:backup`
  - `pnpm db:restore:dryrun`

## Esecuzione manuale

```bash
export DATABASE_URL="postgresql://..."
./infra/scripts/db-backup.sh
./infra/scripts/db-restore-dryrun.sh ./storage/backups/latest.dump
```

## Politica consigliata

- Backup automatico giornaliero.
- Retention minima 14 giorni.
- Test restore dry-run almeno 1 volta a settimana.
- Test restore completo su staging almeno 1 volta al mese.

## Automazione CI/GitHub Actions

- Workflow: `.github/workflows/db-backup-verify.yml`
- Frequenza:
  - giornaliera alle 03:00 UTC
  - esecuzione manuale (`workflow_dispatch`)
- Requisiti:
  - secret repository `RISTOSAAS_DATABASE_URL`
  - accesso rete dal runner verso il DB
- Output:
  - backup `.dump` caricato come artifact con retention 14 giorni
  - dry-run restore eseguito su ogni run

## Procedura incidente (sintesi)

1. Blocca write path non essenziali.
2. Verifica ultimo backup valido (`pg_restore --list`).
3. Ripristina su staging e valida coerenza applicativa.
4. Esegui restore su produzione solo dopo validazione staging.
5. Monitora `/api/health` e dashboard operativa post-restore.
