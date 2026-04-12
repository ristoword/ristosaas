"use client";

import { useState } from "react";
import {
  CreditCard,
  Eye,
  EyeOff,
  Link2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";

const mockPayments = [
  { id: "pi_1", data: "2026-04-11", importo: 49.0, stato: "riuscito", descrizione: "Piano Pro mensile" },
  { id: "pi_2", data: "2026-03-11", importo: 49.0, stato: "riuscito", descrizione: "Piano Pro mensile" },
  { id: "pi_3", data: "2026-02-11", importo: 49.0, stato: "riuscito", descrizione: "Piano Pro mensile" },
  { id: "pi_4", data: "2026-01-11", importo: 49.0, stato: "fallito", descrizione: "Piano Pro mensile" },
  { id: "pi_5", data: "2025-12-11", importo: 490.0, stato: "riuscito", descrizione: "Piano Pro annuale" },
];

export function StripePage() {
  const [showKey, setShowKey] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const apiKey = "sk_test_demo_masked_key";
  const webhookUrl = "https://api.ristodemo.it/webhooks/stripe";

  return (
    <div className="space-y-6">
      <PageHeader title="Integrazione Stripe" subtitle="Gestisci pagamenti e abbonamento" />

      {/* subscription status */}
      <Card title="Stato abbonamento">
        <div className="flex flex-wrap items-center gap-4">
          <Chip label="Piano Pro" tone="accent" />
          <Chip label="Attivo" tone="success" />
          <span className="text-sm text-rw-muted">Prossimo rinnovo: 11 maggio 2026</span>
        </div>

        <div className="mt-4 flex gap-2">
          {(["monthly", "annual"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setBilling(p)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${billing === p ? "bg-rw-accent/15 text-rw-accent" : "border border-rw-line bg-rw-surfaceAlt text-rw-muted"}`}
            >
              {p === "monthly" ? "Mensile — €49/mese" : "Annuale — €490/anno"}
            </button>
          ))}
        </div>

        <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white shadow-rw transition hover:bg-rw-accent/90">
          <CreditCard className="h-4 w-4" /> Aggiorna piano
        </button>
      </Card>

      {/* API keys */}
      <Card title="Chiavi API" description="Le chiavi sono mascherate per sicurezza">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-rw-muted">Secret key</label>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? "text" : "password"}
                readOnly
                value={showKey ? "sk_test_demo_example_key" : apiKey}
                className="flex-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 font-mono text-sm text-rw-ink"
              />
              <button type="button" onClick={() => setShowKey((v) => !v)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-muted">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-muted">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-rw-muted">Webhook URL</label>
            <div className="flex items-center gap-2">
              <input type="text" readOnly value={webhookUrl} className="flex-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 font-mono text-sm text-rw-ink" />
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-muted">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">Webhook verificato e attivo</span>
          </div>
        </div>
      </Card>

      {/* payment history */}
      <Card title="Storico pagamenti" headerRight={
        <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-rw-accent">
          <ExternalLink className="h-3.5 w-3.5" /> Dashboard Stripe
        </button>
      }>
        <DataTable
          columns={[
            { key: "data", header: "Data", render: (r) => <span className="text-rw-ink">{r.data}</span> },
            { key: "descrizione", header: "Descrizione", render: (r) => <span className="text-rw-ink">{r.descrizione}</span> },
            { key: "importo", header: "Importo", render: (r) => <span className="font-semibold text-rw-ink">€ {r.importo.toFixed(2)}</span> },
            {
              key: "stato", header: "Stato", render: (r) => (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  {r.stato === "riuscito" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                  <span className={r.stato === "riuscito" ? "text-emerald-400" : "text-red-400"}>{r.stato}</span>
                </span>
              ),
            },
          ]}
          data={mockPayments}
          keyExtractor={(r) => r.id}
        />
      </Card>

      {/* mock checkout */}
      <div className="flex justify-end">
        <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-rw-accent px-6 py-3.5 text-base font-semibold text-white shadow-rw transition hover:bg-rw-accent/90">
          <Receipt className="h-5 w-5" /> Simula checkout
        </button>
      </div>
    </div>
  );
}
