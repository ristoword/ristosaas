"use client";

import { X } from "lucide-react";
import type { StockAlert } from "@/components/orders/orders-context";

type Props = {
  alerts: StockAlert[];
  onClose: () => void;
};

export function StockAlertBanner({ alerts, onClose }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-bold text-red-400">⚠ Scorta esaurita o sotto minima</p>
          {alerts.map((a) => (
            <p key={a.itemId} className="text-xs text-red-300">
              <span className={a.level === "critical" ? "font-bold" : ""}>
                {a.itemName}
              </span>
              {" — "}
              {a.level === "critical"
                ? `ESAURITO (${a.qty.toFixed(2)} rimasti)`
                : `Sotto scorta: ${a.qty.toFixed(2)} / min ${a.minStock}`}
            </p>
          ))}
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-red-400 hover:text-red-300">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
