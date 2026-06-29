"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BedDouble,
  CalendarRange,
  ClipboardList,
  ConciergeBell,
  CreditCard,
  DoorOpen,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/core/i18n/provider";
import { MODULE_LINK } from "./styles";

type Module = {
  href: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  accent: string;
};

const MODULES: Module[] = [
  { href: "/hotel/front-desk", icon: DoorOpen, titleKey: "hotel.enterprise.module.frontOffice", descKey: "hotel.enterprise.module.frontOffice.sub", accent: "from-sky-500/20" },
  { href: "/hotel/housekeeping", icon: Sparkles, titleKey: "hotel.dashboard.housekeeping.title", descKey: "hotel.enterprise.module.hk.sub", accent: "from-amber-500/20" },
  { href: "/hotel/planner", icon: CalendarRange, titleKey: "hotel.enterprise.action.planner", descKey: "hotel.enterprise.module.planner.sub", accent: "from-violet-500/20" },
  { href: "/hotel/front-desk", icon: ConciergeBell, titleKey: "hotel.enterprise.module.reception", descKey: "hotel.enterprise.module.reception.sub", accent: "from-[#D4AF37]/25" },
  { href: "/hotel/rooms", icon: BedDouble, titleKey: "hotel.enterprise.module.rooms", descKey: "hotel.enterprise.module.rooms.sub", accent: "from-emerald-500/20" },
  { href: "/hotel/reservations", icon: CalendarRange, titleKey: "hotel.dashboard.bookings.title", descKey: "hotel.enterprise.module.reservations.sub", accent: "from-blue-500/20" },
  { href: "/customers", icon: Users, titleKey: "hotel.enterprise.module.crm", descKey: "hotel.enterprise.module.crm.sub", accent: "from-pink-500/20" },
  { href: "/hotel/folio", icon: Wallet, titleKey: "hotel.enterprise.module.revenue", descKey: "hotel.enterprise.module.revenue.sub", accent: "from-[#D4AF37]/20" },
  { href: "/hotel/folio", icon: CreditCard, titleKey: "hotel.enterprise.module.marketing", descKey: "hotel.enterprise.module.marketing.sub", accent: "from-orange-500/20" },
  { href: "/hotel/folio", icon: Wallet, titleKey: "hotel.enterprise.module.accounting", descKey: "hotel.enterprise.module.accounting.sub", accent: "from-teal-500/20" },
  { href: "/hotel/staff", icon: Users, titleKey: "hotel.dashboard.staff.title", descKey: "hotel.enterprise.module.staff.sub", accent: "from-indigo-500/20" },
  { href: "/hotel/staff-hr", icon: Users, titleKey: "hotel.dashboard.hr.title", descKey: "hotel.enterprise.module.hr.sub", accent: "from-rose-500/20" },
  { href: "/controllo-vendite", icon: BarChart3, titleKey: "hotel.enterprise.module.report", descKey: "hotel.enterprise.module.report.sub", accent: "from-cyan-500/20" },
  { href: "/dashboard", icon: ClipboardList, titleKey: "hotel.enterprise.module.analytics", descKey: "hotel.enterprise.module.analytics.sub", accent: "from-lime-500/20" },
];

export function HotelModuleAccess() {
  const { t } = useI18n();

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-[#D4AF37]/90">
        {t("hotel.enterprise.quickAccess")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href + mod.titleKey}
              href={mod.href}
              className={`${MODULE_LINK} bg-gradient-to-br ${mod.accent} to-rw-surfaceAlt`}
            >
              <Icon className="mb-2 h-7 w-7 text-[#D4AF37]" />
              <p className="font-display text-base font-bold text-rw-ink">{t(mod.titleKey)}</p>
              <p className="line-clamp-2 text-xs text-rw-muted">{t(mod.descKey)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
