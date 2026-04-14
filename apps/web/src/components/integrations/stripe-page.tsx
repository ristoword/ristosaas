"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { billingApi, type BillingEvent, type BillingReadiness, type BillingSubscription } from "@/lib/api-client";

export function StripePage() {
  const [showKey, setShowKey] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [plan, setPlan] = useState<"restaurant_only" | "hotel_only" | "all_included">("all_included");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingReconcile, setLoadingReconcile] = useState(false);
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const apiKey = "sk_test_demo_masked_key";
  const webhookUrl = "https://api.ristodemo.it/webhooks/stripe";
  const isConnected = !!subscription;

  const loadBilling = useCallback(async () => {
    const [overview, readinessSnapshot] = await Promise.all([
      billingApi.overview(),
      billingApi.readiness(),
    ]);
    setSubscription(overview.subscription);
    setEvents(overview.events);
    setReadiness(readinessSnapshot);
  }, []);

  useEffect(() => {
    billingApi
      .readiness()
      .then((snapshot) => {
        setReadiness(snapshot);
        return billingApi.overview();
      })
      .then((overview) => {
        setSubscription(overview.subscription);
        setEvents(overview.events);
      })
      .catch(() => {
        setSubscription(null);
        setEvents([]);
        setReadiness(null);
      });
  }, []);

  const payments = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        data: event.createdAt.slice(0, 10),
        importo: 0,
        stato: event.status === "processed" ? "riuscito" : "fallito",
        descrizione: event.type,
      })),
    [events],
  );

  const openCheckout = useCallback(async () => {
    setActionError(null);
    setLoadingCheckout(true);
    try {
      const session = await billingApi.checkout({ plan, billingCycle: billing });
      window.location.href = session.url;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Errore durante creazione checkout Stripe");
    } finally {
      setLoadingCheckout(false);
    }
  }, [billing, plan]);

  const openPortal = useCallback(async () => {
    setActionError(null);
    setLoadingPortal(true);
    try {
      const session = await billingApi.portal();
      window.location.href = session.url;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Errore durante apertura portal Stripe");
    } finally {
      setLoadingPortal(false);
    }
  }, []);

  const reconcileEntitlements = useCallback(async () => {
    setActionError(null);
    setLoadingReconcile(true);
    try {
      const result = await billingApi.reconcile();
      if (!result.reconciled) {
        setActionError(`Reconcile non completato: ${result.reason || "motivo non disponibile"}`);
      }
      await loadBilling();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Errore durante reconcile licenza");
    } finally {
      setLoadingReconcile(false);
    }
  }, [loadBilling]);

  return (
    <div className="space-y-6">
      <PageHeader title="Integrazione Stripe" subtitle="Gestisci pagamenti e abbonamento" />

      {/* subscription status */}
      <Card title="Stato abbonamento">
        <div className="flex flex-wrap items-center gap-4">
            <Chip label={subscription?.priceId || "Piano non collegato"} tone="accent" />
            <Chip label={subscription?.status || "Da configurare"} tone={subscription?.status === "active" ? "success" : "warn"} />
            <span className="text-sm text-rw-muted">
              Prossimo rinnovo: {subscription?.currentPeriodEnd ? subscription.currentPeriodEnd.slice(0, 10) : "n/d"}
            </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { value: "restaurant_only", label: "Solo Ristorante" },
            { value: "hotel_only", label: "Solo Hotel" },
            { value: "all_included", label: "All Included" },
          ] as const).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPlan(item.value)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${plan === item.value ? "bg-rw-accent/15 text-rw-accent" : "border border-rw-line bg-rw-surfaceAlt text-rw-muted"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCheckout}
            disabled={loadingCheckout}
            className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white shadow-rw transition hover:bg-rw-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" /> {loadingCheckout ? "Apro checkout..." : "Aggiorna piano"}
          </button>
          <button
            type="button"
            onClick={openPortal}
            disabled={loadingPortal}
            className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-5 py-2.5 text-sm font-semibold text-rw-ink transition hover:bg-rw-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ExternalLink className="h-4 w-4" /> {loadingPortal ? "Apro portal..." : "Apri customer portal"}
          </button>
        </div>
        {actionError ? <p className="mt-2 text-sm font-medium text-red-400">{actionError}</p> : null}
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

          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isConnected ? "border border-emerald-500/30 bg-emerald-500/10" : "border border-amber-500/30 bg-amber-500/10"}`}>
            {isConnected ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-amber-300" />}
            <span className={`text-sm font-semibold ${isConnected ? "text-emerald-300" : "text-amber-200"}`}>
              {isConnected ? "Webhook attivo e subscription tracciata su DB" : "Webhook non ancora collegato in produzione"}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Readiness go-live billing">
        <div className="flex flex-wrap items-center gap-2">
          <Chip label={readiness?.overallReady ? "Go-live billing pronto" : "Go-live billing non pronto"} tone={readiness?.overallReady ? "success" : "warn"} />
          <Chip label={readiness?.integrationReady ? "Integrazione Stripe OK" : "Integrazione Stripe incompleta"} tone={readiness?.integrationReady ? "success" : "warn"} />
          <Chip label={readiness?.tenantReady ? "Tenant allineato" : "Tenant da allineare"} tone={readiness?.tenantReady ? "success" : "warn"} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
            <p className="text-sm font-semibold text-rw-ink">Controlli integrazione</p>
            <ul className="mt-2 space-y-1 text-sm text-rw-muted">
              {(readiness?.envChecks || []).map((check) => (
                <li key={check.key} className={check.ok ? "text-emerald-300" : "text-amber-200"}>
                  {check.ok ? "✓" : "•"} {check.message}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
            <p className="text-sm font-semibold text-rw-ink">Controlli tenant</p>
            <ul className="mt-2 space-y-1 text-sm text-rw-muted">
              {(readiness?.tenantChecks || []).map((check) => (
                <li key={check.key} className={check.ok ? "text-emerald-300" : "text-amber-200"}>
                  {check.ok ? "✓" : "•"} {check.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {readiness?.nextActions?.length ? (
          <div className="mt-4 rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
            <p className="text-sm font-semibold text-rw-ink">Prossime azioni consigliate</p>
            <ul className="mt-2 space-y-1 text-sm text-rw-muted">
              {readiness.nextActions.map((action) => (
                <li key={action}>• {action}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reconcileEntitlements}
            disabled={loadingReconcile}
            className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-5 py-2.5 text-sm font-semibold text-rw-ink transition hover:bg-rw-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Link2 className="h-4 w-4" /> {loadingReconcile ? "Riconcilio..." : "Riconcilia entitlements"}
          </button>
        </div>
      </Card>

      {/* payment history */}
      <Card title="Storico pagamenti" headerRight={
        <button type="button" onClick={openPortal} className="inline-flex items-center gap-1.5 text-xs font-semibold text-rw-accent">
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
          data={payments}
          keyExtractor={(r) => r.id}
        />
      </Card>

      {/* quick checkout */}
      <div className="flex justify-end">
        <button type="button" onClick={openCheckout} className="inline-flex items-center gap-2 rounded-2xl bg-rw-accent px-6 py-3.5 text-base font-semibold text-white shadow-rw transition hover:bg-rw-accent/90">
          <Receipt className="h-5 w-5" /> Vai a checkout Stripe
        </button>
      </div>
    </div>
  );
}
