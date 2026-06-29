"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  CalendarPlus,
  ClipboardList,
  ConciergeBell,
  CreditCard,
  DoorOpen,
  LogOut,
  RefreshCw,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useI18n } from "@/core/i18n/provider";
import { QUICK_ACTION } from "./styles";

type Action = {
  href: string;
  icon: LucideIcon;
  titleKey: string;
  subKey: string;
};

const ACTIONS: Action[] = [
  { href: "/hotel/reservations", icon: CalendarPlus, titleKey: "hotel.enterprise.action.newBooking", subKey: "hotel.enterprise.action.newBooking.sub" },
  { href: "/hotel/front-desk", icon: DoorOpen, titleKey: "hotel.enterprise.action.checkin", subKey: "hotel.enterprise.action.checkin.sub" },
  { href: "/hotel/front-desk", icon: LogOut, titleKey: "hotel.enterprise.action.checkout", subKey: "hotel.enterprise.action.checkout.sub" },
  { href: "/hotel/front-desk", icon: BedDouble, titleKey: "hotel.enterprise.action.assignRoom", subKey: "hotel.enterprise.action.assignRoom.sub" },
  { href: "/hotel/front-desk", icon: RefreshCw, titleKey: "hotel.enterprise.action.roomChange", subKey: "hotel.enterprise.action.roomChange.sub" },
  { href: "/hotel/room-service", icon: ConciergeBell, titleKey: "hotel.dashboard.room_service.title", subKey: "hotel.enterprise.action.roomService.sub" },
  { href: "/hotel/folio", icon: CreditCard, titleKey: "hotel.enterprise.action.newFolio", subKey: "hotel.enterprise.action.newFolio.sub" },
  { href: "/hotel/folio", icon: CreditCard, titleKey: "hotel.enterprise.action.payment", subKey: "hotel.enterprise.action.payment.sub" },
  { href: "/hotel/housekeeping", icon: Sparkles, titleKey: "hotel.dashboard.housekeeping.title", subKey: "hotel.enterprise.action.hk.sub" },
  { href: "/hotel/planner", icon: ClipboardList, titleKey: "hotel.enterprise.action.planner", subKey: "hotel.enterprise.action.planner.sub" },
  { href: "/hotel/guest-register", icon: Users, titleKey: "hotel.enterprise.action.guestRegister", subKey: "hotel.enterprise.action.guestRegister.sub" },
  { href: "/hotel/housekeeping", icon: Wrench, titleKey: "hotel.enterprise.action.maintenance", subKey: "hotel.enterprise.action.maintenance.sub" },
];

export function HotelQuickActions() {
  const { t } = useI18n();

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-[#D4AF37]/90">
        {t("hotel.enterprise.quickActions")}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.titleKey} href={action.href} className={QUICK_ACTION}>
              <Icon className="h-[34px] w-[34px] text-[#D4AF37]" strokeWidth={1.5} />
              <span className="mt-1 text-sm font-bold text-rw-ink">{t(action.titleKey)}</span>
              <span className="line-clamp-1 text-xs text-rw-muted">{t(action.subKey)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
