"use client";

import { cn } from "@/lib/utils";
import { GOLD_BTN, GOLD_BTN_ACTIVE } from "./styles";

type Tab = { id: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
};

export function CassaEnterpriseTabs({ tabs, active, onChange }: Props) {
  return (
    <nav className="flex flex-wrap gap-2" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            GOLD_BTN,
            "min-w-[140px] flex-1 sm:flex-none uppercase tracking-wide",
            active === tab.id ? GOLD_BTN_ACTIVE : "text-rw-soft hover:text-[#E8C547]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
