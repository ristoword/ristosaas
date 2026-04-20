# Worker (riservato a futuri job background)

Attualmente non attivo in produzione. I job ricorrenti usano il pattern
HMAC-firmato su endpoint `apps/web`:

- `/api/ai/proposals/schedule/daily` — generazione proposte AI
- `/api/jobs/billing/reconcile-all` — reconcile settimanale Stripe

Vedi i workflow GitHub `ai-ops-daily-proposals.yml` e
`billing-reconcile-weekly.yml`.

Spostare qui solo se emergerà necessità di coda persistente
(BullMQ/Upstash/Redis) per job asincroni pesanti (stampa remota,
invio email massivo, export lunghi).
