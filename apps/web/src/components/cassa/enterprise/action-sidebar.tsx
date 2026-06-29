"use client";

import {
  CreditCard,
  FileText,
  Gift,
  GitBranch,
  History,
  MessageSquare,
  Receipt,
  Star,
  User,
  Wine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { CARD_BASE, TOUCH_BTN_SM } from "./styles";

type Action = {
  id: string;
  icon: React.ReactNode;
  labelKey: string;
  flashKey: string;
};

const ACTIONS: Action[] = [
  { id: "receipt", icon: <Receipt className="h-6 w-6" />, labelKey: "cassa.enterprise.action.receipt", flashKey: "cassa.printBill.flash" },
  { id: "payments", icon: <CreditCard className="h-6 w-6" />, labelKey: "cassa.enterprise.action.payments", flashKey: "cassa.simulateClose.flash" },
  { id: "split", icon: <GitBranch className="h-6 w-6" />, labelKey: "cassa.enterprise.action.split", flashKey: "cassa.enterprise.split.flash" },
  { id: "notes", icon: <MessageSquare className="h-6 w-6" />, labelKey: "cassa.enterprise.action.notes", flashKey: "cassa.enterprise.notes.flash" },
  { id: "history", icon: <History className="h-6 w-6" />, labelKey: "cassa.enterprise.action.history", flashKey: "cassa.enterprise.history.flash" },
  { id: "customer", icon: <User className="h-6 w-6" />, labelKey: "cassa.enterprise.action.customer", flashKey: "cassa.enterprise.customer.flash" },
  { id: "fidelity", icon: <Star className="h-6 w-6" />, labelKey: "cassa.enterprise.action.fidelity", flashKey: "cassa.enterprise.fidelity.flash" },
  { id: "gift", icon: <Gift className="h-6 w-6" />, labelKey: "cassa.enterprise.action.gift", flashKey: "cassa.enterprise.gift.flash" },
  { id: "invoice", icon: <FileText className="h-6 w-6" />, labelKey: "cassa.enterprise.action.invoice", flashKey: "cassa.enterprise.invoice.flash" },
  { id: "precheck", icon: <Wine className="h-6 w-6" />, labelKey: "cassa.enterprise.action.precheck", flashKey: "cassa.enterprise.precheck.flash" },
];

type Props = {
  onAction: (flashKey: string) => void;
  onPrintBill: () => void;
};

export function CassaActionSidebar({ onAction, onPrintBill }: Props) {
  const { t } = useI18n();

  return (
    <aside className={cn(CARD_BASE, "flex h-full min-h-0 w-full flex-col gap-2 p-2 xl:w-[7.5rem]")}>
      {ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => {
            if (action.id === "receipt") onPrintBill();
            else onAction(action.flashKey);
          }}
          className={`${TOUCH_BTN_SM} w-full border border-rw-line/60 bg-rw-surfaceAlt/90 text-rw-ink hover:border-[#D4AF37]/40 hover:text-[#E8C547]`}
        >
          <span className="text-[#D4AF37]">{action.icon}</span>
          <span className="text-center text-[10px] font-bold uppercase leading-tight">{t(action.labelKey)}</span>
        </button>
      ))}
    </aside>
  );
}
