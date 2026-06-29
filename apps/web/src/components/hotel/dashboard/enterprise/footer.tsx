"use client";

import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";
import { useI18n } from "@/core/i18n/provider";
import { useAuth } from "@/components/auth/auth-context";
import { displayPropertyName } from "./display-labels";

type Props = {
  occupancyPct: number;
  availableRooms: number;
  inHouseCount: number;
};

function shiftLabel(): string {
  const h = new Date().getHours();
  if (h < 14) return "Mattina";
  if (h < 18) return "Pomeriggio";
  return "Sera";
}

export function HotelEnterpriseFooter({ occupancyPct, availableRooms, inHouseCount }: Props) {
  const { t } = useI18n();
  const { user, tenant } = useAuth();
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(
        d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) +
          " · " +
          d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="mt-5 rounded-[18px] border border-rw-line/60 bg-rw-surfaceAlt/90 px-5 py-3 text-xs text-rw-muted shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>
            <strong className="text-rw-soft">{t("hotel.enterprise.footer.hotel")}:</strong>{" "}
            {displayPropertyName(tenant?.name)}
          </span>
          <span>{now}</span>
          <span>
            <strong className="text-rw-soft">{t("hotel.enterprise.footer.user")}:</strong> {user?.name ?? "—"}
          </span>
          <span>
            <strong className="text-rw-soft">{t("hotel.enterprise.footer.shift")}:</strong> {shiftLabel()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>
            {t("hotel.kpi.occupancy")}: <strong className="text-[#E8C547]">{occupancyPct}%</strong>
          </span>
          <span>
            {t("hotel.enterprise.kpi.available")}: <strong className="text-emerald-400">{availableRooms}</strong>
          </span>
          <span>
            {t("hotel.enterprise.footer.inHouse")}: <strong className="text-rw-ink">{inHouseCount}</strong>
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Wifi className="h-3 w-3" /> {t("hotel.enterprise.footer.systemOk")}
          </span>
          <span className="font-semibold text-[#D4AF37]/80">RistoSimply Enterprise Gold v2.1.0</span>
        </div>
      </div>
    </footer>
  );
}
