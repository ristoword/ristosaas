"use client";

import { CreditCard } from "lucide-react";
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
      className="fixed bottom-6 right-6 z-40 flex min-h-[120px] min-w-[200px] flex-col items-center justify-center gap-1 rounded-3xl border-2 border-emerald-400/50 bg-gradient-to-b from-emerald-500 to-emerald-600 px-8 py-4 text-white shadow-[0_8px_32px_rgba(16,185,129,0.4)] transition-all duration-200 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-[0_12px_40px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 lg:min-w-[240px]"
    >
      <span className="font-display text-2xl font-black uppercase tracking-wider">{t("cassa.enterprise.pay")}</span>
      <span className="font-display text-4xl font-bold tabular-nums">€ {total.toFixed(2)}</span>
      <span className="flex items-center gap-2 text-sm font-semibold opacity-90">
        <CreditCard className="h-5 w-5" />
        {t("cassa.enterprise.payMethod")}
      </span>
    </button>
  );
}
