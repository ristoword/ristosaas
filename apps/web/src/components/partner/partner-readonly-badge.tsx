"use client";

import { Shield } from "lucide-react";
import { useReadOnlyMode } from "@/components/partner/partner-readonly-provider";

export function PartnerReadOnlyBadge() {
  const { isPartner } = useReadOnlyMode();
  if (!isPartner) return null;

  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300"
      role="status"
      aria-label="Partner read only"
    >
      <Shield className="h-3.5 w-3.5" aria-hidden />
      <span>Partner</span>
      <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">Read only</span>
    </div>
  );
}
