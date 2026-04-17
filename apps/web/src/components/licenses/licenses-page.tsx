"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CreditCard,
  ExternalLink,
  History,
  Key,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import {
  billingApi,
  type BillingEvent,
  type BillingReadiness,
  type BillingSubscription,
} from "@/lib/api-client";
import { formatHumanDate } from "@/lib/date-utils";

type Plan = {
  id: "restaurant_only" | "hotel_only" | "all_included";
  label: string;
  description: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "restaurant_only",
    label: "Restaurant only",
    description: "Solo ristorante: sala, cucina, cassa, menu, food cost, catering.",
    features: ["Sala, KDS, cassa", "Food cost & magazzino", "Menu & catering"],
  },
  {
    id: "hotel_only",
    label: "Hotel only",
    description: "Solo hotel: camere, prenotazioni, housekeeping, check-in/out.",
    features: ["Reception & camere", "Housekeeping", "Rate plans"],
  },
  {
    id: "all_included",
    label: "All Included",
    description: "Ristorante + Hotel con integrazione folio ospite.",
    features: ["Tutto restaurant", "Tutto hotel", "Room charge integrato"],
  },
];

function StatusChip({ status }: { status: string | null | undefined }) {
  const label = (status ?? "unknown").toLowerCase();
  const tone =
    label === "active" || label === "trialing"
      ? "success"
      : label === "past_due" || label === "unpaid"
        ? "warn"
        : label === "canceled" || label === "incomplete_expired"
          ? "danger"
          : "default";
  return <Chip label={label} tone={tone as "success" | "warn" | "danger" | "default"} />;
}

export function LicensesPage() {
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [portalBusy, setPortalBusy] = useState(false);
  const [reconcileBusy, setReconcileBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, rdy] = await Promise.all([billingApi.overview(), billingApi.readiness()]);
      setSubscription(overview.subscription);
      setEvents(overview.events);
      setReadiness(rdy);
    } catch (err) {
      setError((err as Error).message || "Errore caricamento billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCheckout(plan: Plan) {
    setCheckoutBusy(plan.id);
    setError(null);
    try {
      const { url } = await billingApi.checkout({ plan: plan.id, billingCycle: cycle });
      if (typeof window !== "undefined" && url) window.location.href = url;
    } catch (err) {
      setError((err as Error).message || "Errore checkout Stripe");
    } finally {
      setCheckoutBusy(null);
    }
  }

  async function handlePortal() {
    setPortalBusy(true);
    setError(null);
    try {
      const { url } = await billingApi.portal();
      if (typeof window !== "undefined" && url) window.location.href = url;
    } catch (err) {
      setError((err as Error).message || "Portale Stripe non disponibile");
    } finally {
      setPortalBusy(false);
    }
  }

  async function handleReconcile() {
    setReconcileBusy(true);
    setError(null);
    try {
      await billingApi.reconcile();
      await load();
    } catch (err) {
      setError((err as Error).message || "Errore riconciliazione");
    } finally {
      setReconcileBusy(false);
    }
  }

  const tenantPlan = readiness?.tenantSummary?.plan ?? "—";
  const seats = readiness?.tenantSummary?.seats ?? 0;
  const usedSeats = readiness?.tenantSummary?.usedSeats ?? 0;
  const licenseStatus = readiness?.tenantSummary?.licenseStatus ?? null;
  const currentPeriodEnd = subscription?.currentPeriodEnd ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licenza"
        subtitle="Piano, pagamenti Stripe e prontezza integrazione."
      >
        <button
          type="button"
          onClick={handleReconcile}
          disabled={reconcileBusy || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2 text-sm font-semibold text-rw-ink disabled:opacity-50"
        >
          {reconcileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Riconcilia
        </button>
        <button
          type="button"
          onClick={handlePortal}
          disabled={portalBusy || !subscription}
          className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {portalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          Portale Stripe
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Carico stato licenza…
        </div>
      ) : (
        <>
          <Card
            title="Licenza attuale"
            headerRight={<StatusChip status={subscription?.status ?? licenseStatus} />}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Piano",
                  value: tenantPlan,
                  icon: BadgeCheck,
                },
                {
                  label: "Posti usati / totali",
                  value: `${usedSeats} / ${seats}`,
                  icon: ShieldCheck,
                },
                {
                  label: "Scadenza periodo",
                  value: currentPeriodEnd ? formatHumanDate(currentPeriodEnd.slice(0, 10)) : "—",
                  icon: History,
                },
                {
                  label: "Stripe",
                  value:
                    subscription?.stripeCustomerId?.slice(0, 14) ?? "Non collegato",
                  icon: Key,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                  <div className="flex items-center gap-2 text-rw-muted">
                    <item.icon className="h-4 w-4 text-rw-accent" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {item.label}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-sm font-semibold text-rw-ink">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Integrazione Stripe"
            description="Mostra se env, webhook e Stripe sono pronti per il live."
            headerRight={
              readiness?.overallReady ? (
                <Chip label="Pronto" tone="success" />
              ) : (
                <Chip label="Non pronto" tone="warn" />
              )
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rw-muted">
                  Env / infrastruttura
                </p>
                <ul className="space-y-2 text-sm">
                  {(readiness?.envChecks ?? []).map((check) => (
                    <li key={check.key} className="flex items-start gap-2">
                      {check.ok ? (
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      )}
                      <div>
                        <p className="font-semibold text-rw-ink">{check.key}</p>
                        <p className="text-xs text-rw-muted">{check.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rw-muted">
                  Tenant
                </p>
                <ul className="space-y-2 text-sm">
                  {(readiness?.tenantChecks ?? []).map((check) => (
                    <li key={check.key} className="flex items-start gap-2">
                      {check.ok ? (
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      )}
                      <div>
                        <p className="font-semibold text-rw-ink">{check.key}</p>
                        <p className="text-xs text-rw-muted">{check.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {(readiness?.nextActions?.length ?? 0) > 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                <p className="font-semibold">Prossimi passi:</p>
                <ul className="mt-1 list-disc pl-4">
                  {readiness!.nextActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card
            title="Piani disponibili"
            description="Scegli un piano e avvia il checkout Stripe."
            headerRight={
              <div className="flex items-center gap-1 rounded-xl border border-rw-line bg-rw-surfaceAlt p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCycle("monthly")}
                  className={`rounded-lg px-3 py-1 ${
                    cycle === "monthly" ? "bg-rw-accent text-white" : "text-rw-muted"
                  }`}
                >
                  Mensile
                </button>
                <button
                  type="button"
                  onClick={() => setCycle("annual")}
                  className={`rounded-lg px-3 py-1 ${
                    cycle === "annual" ? "bg-rw-accent text-white" : "text-rw-muted"
                  }`}
                >
                  Annuale
                </button>
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PLANS.map((plan) => {
                const isCurrent = plan.id === tenantPlan;
                const busy = checkoutBusy === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col rounded-xl border p-4 ${
                      isCurrent ? "border-rw-accent/40 bg-rw-accent/5" : "border-rw-line bg-rw-surfaceAlt"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-display text-base font-semibold text-rw-ink">
                        {plan.label}
                      </p>
                      {isCurrent && <Chip label="Attivo" tone="success" />}
                    </div>
                    <p className="mt-1 text-xs text-rw-muted">{plan.description}</p>
                    <ul className="mt-3 flex-1 space-y-1">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-xs text-rw-soft"
                        >
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-rw-accent" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => handleCheckout(plan)}
                      disabled={isCurrent || busy}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surface px-4 py-2 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-rw-accent" />
                      )}
                      {isCurrent ? "Piano attuale" : "Checkout Stripe"}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Ultimi eventi billing" description="Webhook Stripe ricevuti e processati.">
            <DataTable
              columns={[
                {
                  key: "createdAt",
                  header: "Data",
                  render: (r) => (
                    <span className="font-mono text-xs text-rw-muted">
                      {new Date(r.createdAt).toLocaleString("it-IT")}
                    </span>
                  ),
                },
                {
                  key: "type",
                  header: "Tipo",
                  render: (r) => (
                    <span className="font-semibold text-rw-ink">{r.type}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Stato",
                  render: (r) => <StatusChip status={r.status} />,
                },
                {
                  key: "processedAt",
                  header: "Processato",
                  render: (r) => (
                    <span className="text-xs text-rw-muted">
                      {r.processedAt ? new Date(r.processedAt).toLocaleString("it-IT") : "—"}
                    </span>
                  ),
                },
              ]}
              data={events}
              keyExtractor={(r) => r.id}
              emptyMessage="Nessun evento Stripe registrato ancora."
            />
          </Card>
        </>
      )}
    </div>
  );
}
