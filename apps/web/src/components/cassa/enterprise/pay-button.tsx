"use client";

import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";

type Props = {
  total: number;
  disabled: boolean;
  onPay: () => void;
};

export function CassaPayButton({ total, disabled, onPay }: Props) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPay}
      className={cn(
        "fixed z-40 flex flex-col items-center justify-center gap-0.5 rounded-3xl border-2 border-emerald-400/50 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_8px_32px_rgba(16,185,129,0.4)] transition-all duration-200 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-[0_12px_40px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        "bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 min-h-[72px] px-4 py-3",
        "sm:left-auto sm:right-6 sm:min-h-[96px] sm:min-w-[200px] sm:px-8 sm:py-4",
        "lg:min-h-[110px] lg:min-w-[220px]",
        "xl:min-h-[120px] xl:min-w-[240px]",
      )}
    >
      <span className="font-display text-lg font-black uppercase tracking-wider sm:text-2xl">{t("cassa.enterprise.pay")}</span>
      <span className="font-display text-2xl font-bold tabular-nums sm:text-4xl">€ {total.toFixed(2)}</span>
      <span className="hidden items-center gap-2 text-sm font-semibold opacity-90 sm:flex">
        <CreditCard className="h-5 w-5" />
        {t("cassa.enterprise.payMethod")}
      </span>
    </button>
  );
}
