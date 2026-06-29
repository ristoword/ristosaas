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
    <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            GOLD_BTN,
            "min-w-0 flex-1 uppercase tracking-wide sm:min-w-[8rem] sm:flex-none lg:min-w-[140px]",
            active === tab.id ? GOLD_BTN_ACTIVE : "text-rw-soft hover:text-[#E8C547]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
