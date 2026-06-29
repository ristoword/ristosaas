"use client";

import { useState } from "react";
import { Loader2, QrCode } from "lucide-react";
import { useI18n } from "@/core/i18n/provider";
import { TOUCH_BTN_SM } from "./styles";

export function PayOnlineButton({ total, tableLabel }: { total: number; tableLabel: string }) {
  const { t } = useI18n();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/cassa/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          description: `Conto${tableLabel ? ` — Tavolo ${tableLabel}` : ""}`,
        }),
      });
      if (!res.ok) {
        console.error("Payment link failed:", res.status);
        return;
      }
      const data = await res.json();
      if (!data.url) return;
      setQrUrl(data.url);
      setOpen(true);
    } catch (e) {
      console.error("Payment link error:", e);
    } finally {
      setLoading(false);
    }
  }

  const qrImg = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(qrUrl)}`
    : "";

  return (
    <>
      <button
        type="button"
        onClick={() => void generate()}
        disabled={loading || total <= 0}
        className={`${TOUCH_BTN_SM} border border-rw-line bg-rw-surfaceAlt text-rw-ink hover:border-[#D4AF37]/40 disabled:opacity-40`}
      >
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <QrCode className="h-6 w-6 text-[#D4AF37]" />}
        <span>{t("cassa.payOnline")}</span>
      </button>
      {open && qrUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-[#D4AF37]/30 bg-rw-bg p-8 text-center shadow-2xl">
            <p className="font-display text-2xl font-semibold text-rw-ink mb-1">{t("cassa.payWithQr")}</p>
            <p className="text-base text-rw-muted mb-5">
              {t("ui.total")}: <span className="font-bold text-[#D4AF37]">€ {total.toFixed(2)}</span>
            </p>
            <div className="mx-auto mb-5 flex h-56 w-56 items-center justify-center rounded-2xl border border-rw-line bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImg} alt="QR pagamento" className="h-full w-full object-contain" />
            </div>
            <p className="text-sm text-rw-muted mb-5">{t("cassa.qr.scanDesc")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(qrUrl);
                }}
                className="flex-1 min-h-[80px] rounded-2xl border border-rw-line py-3 text-sm font-semibold text-rw-muted hover:bg-rw-surfaceAlt"
              >
                {t("cassa.copyLink")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQrUrl(null);
                }}
                className="flex-1 min-h-[80px] rounded-2xl bg-[#D4AF37] py-3 text-sm font-semibold text-black"
              >
                {t("ui.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
