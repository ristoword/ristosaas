"use client";

import { useState } from "react";
import {
  BadgeCheck,
  CreditCard,
  History,
  Key,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";

type LicenseStatus = "trial" | "active" | "expired";

const currentLicense = {
  key: "RW-PRO-A1B2C3D4",
  status: "active" as LicenseStatus,
  plan: "Pro",
  billing: "annual" as const,
  activatedAt: "2025-06-15",
  expiresAt: "2026-06-15",
  seats: 15,
  usedSeats: 12,
};

const plans = [
  { id: "starter-m", name: "Starter", period: "Mensile", price: "€ 29/mese", features: ["5 utenti", "1 locale", "Supporto email"] },
  { id: "starter-a", name: "Starter", period: "Annuale", price: "€ 290/anno", features: ["5 utenti", "1 locale", "Supporto email", "2 mesi gratis"] },
  { id: "pro-m", name: "Pro", period: "Mensile", price: "€ 79/mese", features: ["15 utenti", "3 locali", "Supporto prioritario", "Analytics"] },
  { id: "pro-a", name: "Pro", period: "Annuale", price: "€ 790/anno", features: ["15 utenti", "3 locali", "Supporto prioritario", "Analytics", "2 mesi gratis"] },
  { id: "enterprise", name: "Enterprise", period: "Annuale", price: "Su misura", features: ["Utenti illimitati", "Locali illimitati", "SLA dedicato", "Onboarding personalizzato"] },
];

type HistoryEntry = { id: string; date: string; event: string; detail: string };

const licenseHistory: HistoryEntry[] = [
  { id: "h1", date: "2025-06-15", event: "Attivazione", detail: "Licenza Pro attivata — chiave RW-PRO-A1B2C3D4" },
  { id: "h2", date: "2025-06-15", event: "Pagamento", detail: "€ 790 — piano annuale via Stripe" },
  { id: "h3", date: "2025-03-10", event: "Trial scaduto", detail: "Periodo di prova di 14 giorni terminato" },
  { id: "h4", date: "2025-02-24", event: "Registrazione", detail: "Account creato — trial attivato automaticamente" },
];

const statusLabel: Record<LicenseStatus, string> = { trial: "Trial", active: "Attiva", expired: "Scaduta" };
const statusTone: Record<LicenseStatus, "warn" | "success" | "danger"> = { trial: "warn", active: "success", expired: "danger" };

export function LicensesPage() {
  const [keyInput, setKeyInput] = useState("");
  const [activating, setActivating] = useState(false);

  function handleActivate() {
    if (!keyInput.trim()) return;
    setActivating(true);
    setTimeout(() => setActivating(false), 1500);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Licenza" subtitle="Gestisci la tua licenza, il piano attivo e i pagamenti" />

      <Card
        title="Licenza attuale"
        headerRight={<Chip label={statusLabel[currentLicense.status]} tone={statusTone[currentLicense.status]} />}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Chiave", value: currentLicense.key, icon: Key },
            { label: "Piano", value: `${currentLicense.plan} (${currentLicense.billing === "annual" ? "Annuale" : "Mensile"})`, icon: BadgeCheck },
            { label: "Posti", value: `${currentLicense.usedSeats} / ${currentLicense.seats}`, icon: ShieldCheck },
            { label: "Scadenza", value: currentLicense.expiresAt, icon: History },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-2 text-rw-muted">
                <item.icon className="h-4 w-4 text-rw-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
              </div>
              <p className="mt-2 font-display text-sm font-semibold text-rw-ink">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Attiva una licenza" description="Inserisci la chiave ricevuta via email dopo l'acquisto.">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="RW-XXX-XXXXXXXX"
            className="flex-1 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted"
          />
          <button
            type="button"
            onClick={handleActivate}
            disabled={activating || !keyInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
          >
            {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            {activating ? "Attivando…" : "Attiva"}
          </button>
        </div>
      </Card>

      <Card title="Piani disponibili" description="Scegli il piano più adatto al tuo ristorante.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.name === currentLicense.plan && ((p.period === "Annuale" && currentLicense.billing === "annual") || (p.period === "Mensile" && currentLicense.billing !== "annual"));
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-xl border p-4 ${isCurrent ? "border-rw-accent/40 bg-rw-accent/5" : "border-rw-line bg-rw-surfaceAlt"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-base font-semibold text-rw-ink">{p.name}</p>
                  <span className="text-xs text-rw-muted">{p.period}</span>
                </div>
                <p className="mt-1 font-display text-lg font-semibold text-rw-accent">{p.price}</p>
                <ul className="mt-3 flex-1 space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-rw-soft">
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-rw-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCurrent}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surface px-4 py-2 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 disabled:opacity-40"
                >
                  <CreditCard className="h-4 w-4 text-rw-accent" />
                  {isCurrent ? "Piano attuale" : "Checkout Stripe"}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Storico licenza">
        <DataTable
          columns={[
            { key: "date", header: "Data" },
            { key: "event", header: "Evento", render: (r) => <span className="font-semibold text-rw-ink">{r.event}</span> },
            { key: "detail", header: "Dettaglio" },
          ]}
          data={licenseHistory}
          keyExtractor={(r) => r.id}
        />
      </Card>
    </div>
  );
}
