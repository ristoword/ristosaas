"use client";

import { Printer, Wifi, Wallet, Clock } from "lucide-react";
import { useI18n } from "@/core/i18n/provider";
import { useAuth } from "@/components/auth/auth-context";

type Props = {
  lastClosureDate?: string | null;
};

function shiftLabel(): string {
  const h = new Date().getHours();
  if (h < 14) return "Mattina";
  if (h < 18) return "Pomeriggio";
  return "Sera";
}

export function CassaEnterpriseFooter({ lastClosureDate }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <footer className="mt-4 rounded-xl border border-rw-line/60 bg-rw-surfaceAlt/80 px-4 py-2.5 text-xs text-rw-muted">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>
            <strong className="text-rw-soft">{t("cassa.enterprise.cashier")}:</strong>{" "}
            {user?.name ?? "—"}
          </span>
          <span>
            <strong className="text-rw-soft">{t("cassa.enterprise.shift")}:</strong> {shiftLabel()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <strong className="text-rw-soft">{t("cassa.enterprise.openSince")}:</strong> 08:00
          </span>
          <span>
            <strong className="text-rw-soft">{t("cassa.enterprise.lastClosure")}:</strong>{" "}
            {lastClosureDate ?? "—"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="flex items-center gap-1 text-emerald-400">
            <Printer className="h-3 w-3" /> {t("cassa.enterprise.printer")}: Online
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <Wallet className="h-3 w-3" /> {t("cassa.enterprise.drawer")}: Aperto
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Wifi className="h-3 w-3" /> {t("cassa.enterprise.connection")}: Online
          </span>
          <span className="font-semibold text-[#D4AF37]/80">RistoSimply Enterprise Gold v2.1.0</span>
        </div>
      </div>
    </footer>
  );
}
