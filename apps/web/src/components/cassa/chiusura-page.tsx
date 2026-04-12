"use client";

import { useState } from "react";
import {
  Printer,
  Download,
  Lock,
  CreditCard,
  Banknote,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wine,
  Pizza,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";

const summary = {
  lordoTotale: 3842.5,
  storni: 65.0,
  netto: 3777.5,
  iva: 692.38,
  contanti: 1520.0,
  carte: 2257.5,
  scontrini: 87,
  copertiTotali: 214,
};

const employees = [
  { id: "e1", nome: "Marco R.", coperti: 62, incasso: 1120.5, scontrini: 24 },
  { id: "e2", nome: "Sara L.", coperti: 58, incasso: 980.0, scontrini: 22 },
  { id: "e3", nome: "Luca B.", coperti: 48, incasso: 892.0, scontrini: 21 },
  { id: "e4", nome: "Anna P.", coperti: 46, incasso: 785.0, scontrini: 20 },
];

const categories = [
  { id: "c1", nome: "Cucina", icon: UtensilsCrossed, totale: 1945.0, pct: 51.5 },
  { id: "c2", nome: "Bevande", icon: Wine, totale: 1032.5, pct: 27.3 },
  { id: "c3", nome: "Pizzeria", icon: Pizza, totale: 800.0, pct: 21.2 },
];

const departments = [
  { id: "d1", reparto: "Sala principale", totale: 2450.0 },
  { id: "d2", reparto: "Terrazza", totale: 890.0 },
  { id: "d3", reparto: "Bar", totale: 437.5 },
];

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof TrendingUp; tone?: string }) {
  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surface p-4">
      <div className="flex items-center gap-2 text-rw-muted">
        <Icon className={`h-4 w-4 ${tone ?? "text-rw-accent"}`} />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-rw-ink">{value}</p>
    </div>
  );
}

export function ChiusuraPage() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Chiusura di cassa (Z)" subtitle="Riepilogo giornaliero — 11 aprile 2026">
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink">
          <Printer className="h-4 w-4" /> Stampa
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink">
          <Download className="h-4 w-4" /> Esporta PDF
        </button>
      </PageHeader>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Incasso lordo" value={`€ ${summary.lordoTotale.toFixed(2)}`} icon={TrendingUp} />
        <Stat label="Netto (dopo storni)" value={`€ ${summary.netto.toFixed(2)}`} icon={TrendingUp} tone="text-emerald-400" />
        <Stat label="Contanti" value={`€ ${summary.contanti.toFixed(2)}`} icon={Banknote} />
        <Stat label="Carte" value={`€ ${summary.carte.toFixed(2)}`} icon={CreditCard} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Storni" value={`€ ${summary.storni.toFixed(2)}`} icon={TrendingUp} tone="text-red-400" />
        <Stat label="IVA totale" value={`€ ${summary.iva.toFixed(2)}`} icon={TrendingUp} />
        <Stat label="Scontrini / Coperti" value={`${summary.scontrini} / ${summary.copertiTotali}`} icon={Users} />
      </div>

      {/* employee breakdown */}
      <Card title="Dettaglio per cameriere" description="Incasso individuale nella giornata">
        <DataTable
          columns={[
            { key: "nome", header: "Cameriere", render: (r) => <span className="font-semibold text-rw-ink">{r.nome}</span> },
            { key: "coperti", header: "Coperti", render: (r) => r.coperti },
            { key: "scontrini", header: "Scontrini", render: (r) => r.scontrini },
            { key: "incasso", header: "Incasso", render: (r) => <span className="font-semibold text-rw-ink">€ {r.incasso.toFixed(2)}</span> },
          ]}
          data={employees}
          keyExtractor={(r) => r.id}
        />
      </Card>

      {/* category breakdown */}
      <Card title="Dettaglio per categoria">
        <div className="grid gap-3 sm:grid-cols-3">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-accent/10 text-rw-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-rw-ink">{c.nome}</p>
                  <p className="text-xs text-rw-muted">€ {c.totale.toFixed(2)} · {c.pct}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* department totals */}
      <Card title="Totali per reparto">
        <DataTable
          columns={[
            { key: "reparto", header: "Reparto", render: (r) => <span className="font-semibold text-rw-ink">{r.reparto}</span> },
            { key: "totale", header: "Totale", render: (r) => <span className="font-semibold text-rw-ink">€ {r.totale.toFixed(2)}</span> },
          ]}
          data={departments}
          keyExtractor={(r) => r.id}
        />
      </Card>

      {/* close day */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          disabled={confirmed}
          className="inline-flex items-center gap-2 rounded-2xl bg-rw-accent px-6 py-3.5 text-base font-semibold text-white shadow-rw transition hover:bg-rw-accent/90 disabled:opacity-50"
        >
          <Lock className="h-5 w-5" />
          {confirmed ? "Giornata chiusa" : "Chiudi giornata"}
        </button>
      </div>
    </div>
  );
}
