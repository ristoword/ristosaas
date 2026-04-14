"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BedDouble,
  CreditCard,
  Clock3,
  Hotel,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { getVisibleNavSections } from "@/components/layout/nav-config";
import { useAuth } from "@/components/auth/auth-context";
import { useHotel } from "@/components/hotel/hotel-context";
import { tenantPlatformProfile } from "@/core/tenant/platform-config";
import { useI18n } from "@/core/i18n/provider";
import { useI10n } from "@/core/i10n/formatters";
import { useOrders } from "@/components/orders/orders-context";
import { reportsApi, type ReportTrendsSnapshot } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function DashboardHome() {
  const { user } = useAuth();
  const { rooms, reservations, folios, charges } = useHotel();
  const { activeOrders } = useOrders();
  const { t } = useI18n();
  const { formatCurrency } = useI10n();
  const modules = getVisibleNavSections(user?.role).flatMap((s) => s.items).filter((i) => i.id !== "dashboard");
  const [trends, setTrends] = useState<ReportTrendsSnapshot | null>(null);
  const isRestaurantEnabled = tenantPlatformProfile.enabledFeatures.includes("restaurant");
  const isHotelEnabled = tenantPlatformProfile.enabledFeatures.includes("hotel");
  const inHouseReservations = reservations.filter((reservation) => reservation.status === "in_casa");

  const stats = [
    ...(isRestaurantEnabled
      ? [
          {
            label: "Ordini in corso",
            value: String(activeOrders.length),
            sub: "Operatività ristorante attiva nel pacchetto corrente.",
            tone: "from-rw-accent/15 to-rw-accentSoft/10",
          },
          {
            label: "Verticale Restaurant",
            value: "ON",
            sub: "Tavoli, ordini, cucina, cassa e delivery attivi.",
            tone: "from-emerald-500/15 to-emerald-400/5",
          },
        ]
      : []),
    ...(isHotelEnabled
      ? [
          {
            label: "Camere occupate",
            value: String(rooms.filter((room) => room.status === "occupata").length),
            sub: "Stato camere in tempo reale dal verticale hotel.",
            tone: "from-blue-500/15 to-blue-400/5",
          },
          {
            label: "Arrivi / partenze",
            value: `${reservations.filter((reservation) => reservation.checkInDate === "2026-04-12").length}/${reservations.filter((reservation) => reservation.checkOutDate === "2026-04-12").length}`,
            sub: "Reception, soggiorni e housekeeping nello stesso sistema.",
            tone: "from-amber-400/20 to-amber-300/5",
          },
        ]
      : []),
    ...(isRestaurantEnabled && isHotelEnabled
      ? [
          {
            label: "Folio integrati",
            value: String(folios.length),
            sub: "Conti hotel e addebiti ristorante convergono nello stesso ospite.",
            tone: "from-violet-500/15 to-violet-400/5",
          },
        ]
      : []),
  ];

  const quickActions = [
    ...(isRestaurantEnabled
      ? [
          { title: "Apri un tavolo", body: "Grande, verde, impossibile sbagliare.", icon: Zap },
          { title: "Controlla la sala", body: "Vedi cosa succede senza perderti.", icon: HeartHandshake },
        ]
      : []),
    ...(isHotelEnabled
      ? [
          { title: "Apri il front desk", body: "Check-in, check-out e ospiti in casa.", icon: Hotel },
          { title: "Controlla le camere", body: "Disponibilità, pulizie e manutenzioni.", icon: BedDouble },
        ]
      : []),
    {
      title: "Controllo struttura",
      body: "Core comune e verticali attivi in base al pacchetto acquistato.",
      icon: ShieldCheck,
    },
  ];

  useEffect(() => {
    reportsApi.trends().then(setTrends).catch(() => setTrends(null));
  }, []);

  return (
    <div className="space-y-10 md:space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-rw-line bg-rw-surface p-6 shadow-rw-sm md:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rw-accentGlow blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-rw-line bg-rw-surfaceAlt px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rw-soft">
              <Sparkles className="h-3.5 w-3.5 text-rw-accent" aria-hidden />
              {t("dashboard.hero.badge")}
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-rw-ink md:text-4xl">
              {t("dashboard.hero.title.prefix")}{" "}
              <span className="text-rw-accent">{t("dashboard.hero.title.accent")}</span>.
            </h1>
            <p className="text-base text-rw-soft md:text-lg">
              {t("dashboard.hero.body")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 md:flex-col md:items-stretch">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-muted">
              <Clock3 className="h-5 w-5 text-rw-accent" aria-hidden />
              <span>
                {t("dashboard.plan")}: <strong className="text-rw-ink">{tenantPlatformProfile.plan}</strong>
              </span>
            </div>
            {isRestaurantEnabled && isHotelEnabled ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-muted">
                <CreditCard className="h-5 w-5 text-rw-accent" aria-hidden />
                <span>{t("dashboard.integration.ready")}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="stats-heading" className={cn("grid gap-4", stats.length > 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-3")}>
        <h2 id="stats-heading" className="sr-only">
          Indicatori principali
        </h2>
        {stats.map((s) => (
          <article
            key={s.label}
            className={cn(
              "rounded-3xl border border-rw-line bg-gradient-to-br p-5 shadow-sm",
              s.tone,
            )}
          >
            <p className="text-sm font-medium text-rw-muted">{s.label}</p>
            <p className="mt-2 font-display text-4xl font-semibold text-rw-ink">
              {s.value}
            </p>
            <p className="mt-2 text-sm text-rw-soft">{s.sub}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="trend-heading" className="space-y-4">
        <div>
          <h2 id="trend-heading" className="font-display text-xl font-semibold text-rw-ink">
            Trend ricavi persistenti
          </h2>
          <p className="text-sm text-rw-muted">
            KPI da report giornalieri DB (oggi, ultimi 7 giorni, ultimi 30 giorni).
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { key: "day" as const, label: "Oggi" },
            { key: "week" as const, label: "7 giorni" },
            { key: "month" as const, label: "30 giorni" },
          ].map((period) => {
            const data = trends?.[period.key];
            return (
              <article key={period.key} className="rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm">
                <p className="text-sm font-medium text-rw-muted">{period.label}</p>
                <p className="mt-2 font-display text-3xl font-semibold text-rw-ink">
                  {formatCurrency(data?.revenue ?? 0)}
                </p>
                <p className="mt-2 text-sm text-rw-soft">
                  Margine: {formatCurrency(data?.margin ?? 0)}
                </p>
                <p className="mt-1 text-xs text-rw-muted">
                  Delta vs periodo precedente:{" "}
                  {data?.deltaRevenuePct == null ? "n/d" : `${data.deltaRevenuePct.toFixed(1)}%`}
                </p>
              </article>
            );
          })}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-rw-muted">Forecast prossimi 7 giorni</p>
            <p className="mt-2 font-display text-3xl font-semibold text-rw-ink">
              {formatCurrency(trends?.forecast.next7.projectedRevenue ?? 0)}
            </p>
            <p className="mt-2 text-sm text-rw-soft">
              Margine previsto: {formatCurrency(trends?.forecast.next7.projectedMargin ?? 0)}
            </p>
            <p className="mt-1 text-xs text-rw-muted">
              Affidabilita: {trends?.forecast.next7.confidence ?? "low"}
            </p>
          </article>
          <article className="rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-rw-muted">Forecast prossimi 30 giorni</p>
            <p className="mt-2 font-display text-3xl font-semibold text-rw-ink">
              {formatCurrency(trends?.forecast.next30.projectedRevenue ?? 0)}
            </p>
            <p className="mt-2 text-sm text-rw-soft">
              Margine previsto: {formatCurrency(trends?.forecast.next30.projectedMargin ?? 0)}
            </p>
            <p className="mt-1 text-xs text-rw-muted">
              Affidabilita: {trends?.forecast.next30.confidence ?? "low"}
            </p>
          </article>
        </div>
      </section>

      <section aria-labelledby="quick-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="quick-heading"
              className="font-display text-xl font-semibold text-rw-ink"
            >
              {t("dashboard.quick.title")}
            </h2>
            <p className="text-sm text-rw-muted">
              {t("dashboard.quick.subtitle")}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.title}
                type="button"
                disabled
                className="group flex flex-col items-start gap-4 rounded-3xl border border-dashed border-rw-line bg-rw-surface p-6 text-left shadow-sm transition hover:border-rw-accent/30 hover:shadow-rw-sm disabled:cursor-not-allowed disabled:opacity-80"
                title="Azioni rapide allineate ai verticali acquistati."
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rw-surfaceAlt text-rw-accent ring-1 ring-rw-line">
                  <Icon className="h-7 w-7" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-rw-ink">
                    {a.title}
                  </p>
                  <p className="mt-1 text-sm text-rw-muted">{a.body}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-rw-accent">
                  {t("dashboard.workflow")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {isRestaurantEnabled && isHotelEnabled ? (
        <section aria-labelledby="integration-heading" className="space-y-4">
          <div>
            <h2
              id="integration-heading"
              className="font-display text-xl font-semibold text-rw-ink"
            >
              {t("dashboard.integration.title")}
            </h2>
            <p className="text-sm text-rw-muted">
              {t("dashboard.integration.subtitle")}
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <article className="rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rw-surfaceAlt text-rw-accent ring-1 ring-rw-line">
                  <CreditCard className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-rw-ink">
                    Folio ospite
                  </p>
                  <p className="text-sm text-rw-muted">
                    Conto camera e servizi accessori nello stesso saldo finale.
                  </p>
                </div>
              </div>
              <p className="mt-4 font-display text-3xl font-semibold text-rw-ink">
                {folios.length}
              </p>
              <p className="mt-2 text-sm text-rw-soft">
                Folio attivi o creati dal layer integration.
              </p>
              {folios.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm text-rw-soft">
                  {folios.slice(0, 3).map((folio) => (
                    <li key={folio.id} className="flex items-center justify-between rounded-2xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
                      <span className="font-mono text-xs text-rw-muted">{folio.id}</span>
                      <span className="font-semibold text-rw-ink">{formatCurrency(folio.balance)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className="rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rw-surfaceAlt text-rw-accent ring-1 ring-rw-line">
                  <Hotel className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-rw-ink">
                    Ospiti interni
                  </p>
                  <p className="text-sm text-rw-muted">
                    La reception può riconoscere gli ospiti che consumano al ristorante.
                  </p>
                </div>
              </div>
              <p className="mt-4 font-display text-3xl font-semibold text-rw-ink">
                {inHouseReservations.length}
              </p>
              <p className="mt-2 text-sm text-rw-soft">
                Prenotazioni attualmente in casa e pronte per addebito su camera.
              </p>
              {inHouseReservations.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm text-rw-soft">
                  {inHouseReservations.slice(0, 3).map((reservation) => (
                    <li key={reservation.id} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
                      <p className="font-semibold text-rw-ink">{reservation.guestName}</p>
                      <p className="text-xs text-rw-muted">
                        Camera {reservation.roomId?.replace("hr_", "") || "da assegnare"} · checkout {reservation.checkOutDate}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className="rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rw-surfaceAlt text-rw-accent ring-1 ring-rw-line">
                  <HeartHandshake className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-rw-ink">
                    Flussi integrati
                  </p>
                  <p className="text-sm text-rw-muted">
                    Room charge, piani pasti e report unificati.
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-rw-soft">
                <li>Addebito ordine ristorante su camera</li>
                <li>Colazione inclusa e pacchetti soggiorno</li>
                <li>Conto unico ospite tra front desk e cassa</li>
              </ul>
              <div className="mt-4 rounded-2xl border border-rw-line bg-rw-surfaceAlt px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Ultimi addebiti</p>
                {charges.length === 0 ? (
                  <p className="mt-2 text-sm text-rw-soft">Nessun addebito camera registrato ancora.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-rw-soft">
                    {charges.slice(0, 3).map((charge) => (
                      <li key={charge.id} className="flex items-center justify-between">
                        <span className="truncate pr-3">{charge.description}</span>
                        <span className="font-semibold text-rw-ink">{formatCurrency(charge.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="modules-heading" className="space-y-4">
        <div>
          <h2
            id="modules-heading"
            className="font-display text-xl font-semibold text-rw-ink"
          >
            {t("dashboard.modules.title")}
          </h2>
          <p className="text-sm text-rw-muted">
            {t("dashboard.modules.subtitle")}
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            const inner = (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rw-surfaceAlt text-rw-accent ring-1 ring-rw-line">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold text-rw-ink">
                        {m.label}
                      </p>
                      {!m.ready ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rw-muted">
                          {t("dashboard.comingSoon")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                          {t("dashboard.active")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-rw-muted">{m.hint}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-rw-muted">
                  Core comune, verticali separati e integrazione attivata solo
                  dove serve davvero.
                </p>
              </>
            );

            return (
              <li key={m.id}>
                {m.ready ? (
                  <Link
                    href={m.href}
                    className="flex h-full flex-col rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm transition hover:border-rw-accent/35 hover:shadow-rw-sm"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col rounded-3xl border border-rw-line bg-rw-surface p-5 shadow-sm">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
