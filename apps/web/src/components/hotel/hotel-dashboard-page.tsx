"use client";

import Link from "next/link";
import { BedDouble, Bell, CalendarClock, CalendarRange, ConciergeBell, CreditCard, DoorOpen, Sparkles, TrendingUp, UserCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useHotel } from "@/components/hotel/hotel-context";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import { useState, useMemo } from "react";
import { todayIso } from "@/lib/date-utils";
import { useI18n } from "@/core/i18n/provider";

export function HotelDashboardPage() {
  const [aiOpen, setAiOpen] = useState(false);
  const { rooms, reservations, housekeeping, folios, charges, ratePlans } = useHotel();
  const { t, locale } = useI18n();
  const today = todayIso();

  const revenueStats = useMemo(() => {
    const totalRooms = rooms.length || 1;
    const occupied = rooms.filter((r) => r.status === "occupata").length;
    const occupancyPct = Math.round((occupied / totalRooms) * 100);

    const inHouse = reservations.filter((r) => r.status === "in_casa");
    const totalRevenue = inHouse.reduce((s, r) => s + (Number(r.rate) || 0), 0);
    const adr = inHouse.length > 0 ? totalRevenue / inHouse.length : 0;

    const revPar = adr * (occupied / totalRooms);

    const monthStart = today.slice(0, 7) + "-01";
    const monthlyRevenue = charges
      .filter((c) => c.source === "hotel" && c.postedAt >= monthStart)
      .reduce((s, c) => s + (Number(c.amount) || 0), 0);

    return { occupancyPct, occupied, totalRooms, adr, revPar, monthlyRevenue };
  }, [rooms, reservations, charges, today]);

  const fmtLocale = locale === "nl" ? "nl-NL" : locale === "en" ? "en-GB" : "it-IT";

  const hotelStats = [
    {
      label: t("hotel.kpi.occupancy"),
      value: `${rooms.filter((room) => room.status === "occupata").length}/${rooms.length}`,
      note: t("hotel.kpi.occupancy.note"),
      icon: BedDouble,
    },
    {
      label: t("hotel.kpi.arrivals"),
      value: String(reservations.filter((reservation) => reservation.checkInDate === today).length),
      note: t("hotel.kpi.arrivals.note"),
      icon: DoorOpen,
    },
    {
      label: t("hotel.kpi.departures"),
      value: String(reservations.filter((reservation) => reservation.checkOutDate === today).length),
      note: t("hotel.kpi.departures.note"),
      icon: CreditCard,
    },
    {
      label: t("hotel.kpi.housekeeping"),
      value: String(housekeeping.filter((task) => task.status !== "done").length),
      note: t("hotel.kpi.housekeeping.note"),
      icon: Bell,
    },
  ];

  const integrationHighlights = [
    `${t("hotel.dashboard.folio_active")} ${folios.length}`,
    `${t("hotel.dashboard.restaurant_charges")} ${charges.length}`,
    t("hotel.dashboard.meal_plans"),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("hotel.dashboard.title")}
        subtitle={t("hotel.dashboard.subtitle")}
      >
        <Chip label={t("hotel.dashboard.chip.vertical")} value="Hotel" tone="info" />
        <Chip label="Piano" value="All Included Ready" tone="accent" />
        <AiToggleButton onClick={() => setAiOpen(true)} label={t("hotel.dashboard.ai_label")} />
        <Link href="/hotel/folio" className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white">
          <CreditCard className="h-4 w-4" /> Guest Folio
        </Link>
      </PageHeader>

      {/* Revenue KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("hotel.kpi.occupancy"), value: `${revenueStats.occupancyPct}%`, sub: `${revenueStats.occupied}/${revenueStats.totalRooms} ${t("hotel.kpi.rooms")}`, color: "text-rw-accent" },
          { label: t("hotel.kpi.adr"), value: `€ ${revenueStats.adr.toFixed(0)}`, sub: t("hotel.kpi.adr.sub"), color: "text-emerald-400" },
          { label: t("hotel.kpi.revpar"), value: `€ ${revenueStats.revPar.toFixed(0)}`, sub: t("hotel.kpi.revpar.sub"), color: "text-amber-400" },
          { label: t("hotel.kpi.revenue_month"), value: `€ ${revenueStats.monthlyRevenue.toLocaleString(fmtLocale, { maximumFractionDigits: 0 })}`, sub: `${t("hotel.kpi.revenue_month.sub")} — ${today.slice(0, 7)}`, color: "text-violet-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-rw-muted">{k.label}</p>
              <TrendingUp className="h-4 w-4 text-rw-muted" />
            </div>
            <p className={`mt-3 font-display text-3xl font-semibold ${k.color}`}>{k.value}</p>
            <p className="mt-1 text-xs text-rw-muted">{k.sub}</p>
          </div>
        ))}
      </div>

      <Card title={t("hotel.dashboard.facility.title")} description={t("hotel.dashboard.facility.desc")}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {hotelStats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-rw-muted">{item.label}</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 font-display text-3xl font-semibold text-rw-ink">{item.value}</p>
                <p className="mt-2 text-sm text-rw-soft">{item.note}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title={t("hotel.dashboard.backoffice.title")} description={t("hotel.dashboard.backoffice.desc")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <CalendarRange className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">{t("hotel.dashboard.bookings.title")}</p>
              </div>
              <p className="mt-2 text-sm text-rw-soft">{t("hotel.dashboard.bookings.desc")}</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <DoorOpen className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">{t("hotel.dashboard.checkin.title")}</p>
              </div>
              <p className="mt-2 text-sm text-rw-soft">{t("hotel.dashboard.checkin.desc")}</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">{t("hotel.dashboard.housekeeping.title")}</p>
              </div>
              <p className="mt-2 text-sm text-rw-soft">{t("hotel.dashboard.housekeeping.desc")}</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">{t("hotel.dashboard.stays.title")}</p>
              </div>
              <p className="mt-2 text-sm text-rw-soft">{t("hotel.dashboard.stays.desc")}</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 sm:col-span-2">
              <p className="font-semibold text-rw-ink">{t("hotel.dashboard.rateplans")}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {ratePlans.map((plan) => (
                  <div key={plan.id} className="rounded-xl border border-rw-line bg-rw-surface px-3 py-2 text-sm">
                    <p className="font-semibold text-rw-ink">{plan.name}</p>
                    <p className="text-xs text-rw-muted">
                      {plan.roomType} · {plan.boardType} · € {plan.nightlyRate}{t("hotel.dashboard.per_night")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title={t("hotel.dashboard.integration.title")} description={t("hotel.dashboard.integration.desc")}>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-rw-line bg-rw-surfaceAlt px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rw-soft">
              <Sparkles className="h-3.5 w-3.5 text-rw-accent" />
              Hotel + Restaurant
            </div>
            {integrationHighlights.map((item) => (
              <div key={item} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 text-sm text-rw-soft">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Room Service card */}
      <Link href="/hotel/room-service" className="group rounded-2xl border border-rw-line bg-rw-surfaceAlt p-5 transition hover:border-rw-accent/40 hover:bg-rw-surface">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line group-hover:bg-rw-accent group-hover:text-white transition">
            <ConciergeBell className="h-5 w-5" />
          </span>
          <p className="font-semibold text-rw-ink">{t("hotel.dashboard.room_service.title")}</p>
        </div>
        <p className="text-sm text-rw-soft">{t("hotel.dashboard.room_service.desc")}</p>
      </Link>

      {/* Staff hotel section */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/hotel/turni" className="group rounded-2xl border border-rw-line bg-rw-surfaceAlt p-5 transition hover:border-rw-accent/40 hover:bg-rw-surface">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line group-hover:bg-rw-accent group-hover:text-white transition">
              <CalendarClock className="h-5 w-5" />
            </span>
            <p className="font-semibold text-rw-ink">{t("hotel.dashboard.shifts.title")}</p>
          </div>
          <p className="text-sm text-rw-soft">{t("hotel.dashboard.shifts.desc")}</p>
        </Link>

        <Link href="/hotel/staff" className="group rounded-2xl border border-rw-line bg-rw-surfaceAlt p-5 transition hover:border-rw-accent/40 hover:bg-rw-surface">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line group-hover:bg-rw-accent group-hover:text-white transition">
              <Users className="h-5 w-5" />
            </span>
            <p className="font-semibold text-rw-ink">{t("hotel.dashboard.staff.title")}</p>
          </div>
          <p className="text-sm text-rw-soft">{t("hotel.dashboard.staff.desc")}</p>
        </Link>

        <Link href="/hotel/staff-hr" className="group rounded-2xl border border-rw-line bg-rw-surfaceAlt p-5 transition hover:border-rw-accent/40 hover:bg-rw-surface">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surface text-rw-accent ring-1 ring-rw-line group-hover:bg-rw-accent group-hover:text-white transition">
              <UserCheck className="h-5 w-5" />
            </span>
            <p className="font-semibold text-rw-ink">{t("hotel.dashboard.hr.title")}</p>
          </div>
          <p className="text-sm text-rw-soft">{t("hotel.dashboard.hr.desc")}</p>
        </Link>
      </div>

      <AiChat context="hotel" open={aiOpen} onClose={() => setAiOpen(false)} title={t("hotel.dashboard.ai_chat_title")} />
    </div>
  );
}
