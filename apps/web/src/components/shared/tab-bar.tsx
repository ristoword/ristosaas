"use client";

import { cn } from "@/lib/utils";

type Tab = { id: string; label: string };

type TabBarProps = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
};

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-rw-line bg-rw-surfaceAlt p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
            active === t.id
              ? "bg-rw-accent/15 text-rw-accent"
              : "text-rw-muted hover:text-rw-soft",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
