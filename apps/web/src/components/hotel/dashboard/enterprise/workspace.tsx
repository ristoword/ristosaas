"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useHotel } from "@/components/hotel/hotel-context";
import { AiChat } from "@/components/ai/ai-chat";
import { useI18n } from "@/core/i18n/provider";
import { todayIso } from "@/lib/date-utils";
import { FAB_CLEARANCE, GRID_GAP } from "./styles";
import { useHotelDashboardMetrics } from "./use-hotel-dashboard-metrics";
import { HOTEL_AI_SUGGESTIONS } from "./ai-suggestions";
import { HotelEnterpriseHeader } from "./header";
import { HotelQuickActions } from "./quick-actions";
import { HotelStatusCard } from "./status-card";
import { HotelRoomMap } from "./room-map";
import { HotelArrivalsDepartures } from "./arrivals-departures";
import { HotelAnalyticsRow } from "./analytics-row";
import { HotelRightRail } from "./right-rail";
import { HotelModuleAccess } from "./module-access";
import { HotelEnterpriseFooter } from "./footer";

export function HotelEnterpriseWorkspace() {
  const { t } = useI18n();
  const [aiOpen, setAiOpen] = useState(false);
  const { rooms, reservations, housekeeping, charges } = useHotel();
  const today = todayIso();
  const metrics = useHotelDashboardMetrics(rooms, reservations, housekeeping, charges, today);

  return (
    <div className={`space-y-4 md:space-y-5 ${FAB_CLEARANCE}`}>
      <div className={`flex flex-col ${GRID_GAP} lg:flex-row`}>
        <div className={`flex min-w-0 flex-1 flex-col ${GRID_GAP}`}>
          <HotelEnterpriseHeader metrics={metrics} onAiOpen={() => setAiOpen(true)} />
          <HotelQuickActions />

          <div className={`grid ${GRID_GAP} lg:grid-cols-12`}>
            <div className="min-w-0 lg:col-span-4 xl:col-span-3">
              <HotelStatusCard counts={metrics.roomStatusCounts} />
            </div>
            <div className="min-w-0 lg:col-span-8 xl:col-span-6">
              <HotelRoomMap rooms={rooms} floors={metrics.floors} />
            </div>
            <div className="min-w-0 lg:col-span-12 xl:col-span-3">
              <HotelArrivalsDepartures
                arrivals={metrics.arrivalsToday}
                departures={metrics.departuresToday}
              />
            </div>
          </div>

          <HotelAnalyticsRow
            reservationStats={metrics.reservationStats}
            occupancy7={metrics.occupancySeries7}
            occupancy30={metrics.occupancySeries30}
            occupancy90={metrics.occupancySeries90}
            revenueBreakdown={metrics.revenueBreakdown}
          />

          <HotelModuleAccess />

          <HotelEnterpriseFooter
            occupancyPct={metrics.occupancyPct}
            availableRooms={metrics.availableRooms}
            inHouseCount={metrics.inHouseCount}
          />
        </div>

        <HotelRightRail
          openHousekeeping={metrics.openHousekeeping}
          dirtyRooms={metrics.roomStatusCounts.dirty}
          maintenanceCount={metrics.roomStatusCounts.maintenance}
          occupancyPct={metrics.occupancyPct}
          revPar={metrics.revPar}
          onAiOpen={() => setAiOpen(true)}
        />
      </div>

      <button
        type="button"
        onClick={() => setAiOpen(true)}
        aria-label={t("hotel.enterprise.aiConcierge")}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#D4AF37]/60 bg-gradient-to-br from-[#D4AF37]/35 to-[#D4AF37]/10 text-[#E8C547] shadow-[0_8px_32px_rgba(212,175,55,0.35)] transition duration-[180ms] hover:scale-105 sm:h-16 sm:w-16 sm:right-6 lg:hidden"
      >
        <Sparkles className="h-7 w-7" />
      </button>

      <AiChat
        context="hotel"
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title={t("hotel.dashboard.ai_chat_title")}
        suggestedPrompts={HOTEL_AI_SUGGESTIONS}
        panelClassName="w-[min(100vw,28rem)]"
      />
    </div>
  );
}
