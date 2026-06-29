"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/shared/card";

export function HealthBadge({ status }: { status: string }) {
  const color =
    status === "green"
      ? "text-emerald-400 bg-emerald-500/10"
      : status === "yellow"
        ? "text-amber-400 bg-amber-500/10"
        : "text-red-400 bg-red-500/10";
  return <span className={cn("rounded-lg px-2 py-0.5 text-xs font-semibold uppercase", color)}>{status}</span>;
}

export function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2">
      <p className="truncate text-xs text-rw-muted">{label}</p>
      <p className="font-display text-base font-semibold text-rw-ink sm:text-lg">{value}</p>
    </div>
  );
}

export function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-rw-accent" />
        <h2 className="font-display text-lg font-semibold text-rw-ink">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  saving,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  saving?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-start justify-between gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-rw-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-rw-muted">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin text-rw-muted" />}
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-rw-line accent-rw-accent"
          checked={checked}
          disabled={disabled || saving}
          onChange={(e) => onChange(e.target.checked)}
        />
      </span>
    </label>
  );
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 4 }).format(n);
}

export type ControlTab =
  | "infrastructure"
  | "agents"
  | "prompts"
  | "knowledge"
  | "embeddings"
  | "costs"
  | "usage"
  | "errors"
  | "router"
  | "marketplace"
  | "benchmark"
  | "audit";

export const CONTROL_TABS: { id: ControlTab; labelKey: string }[] = [
  { id: "infrastructure", labelKey: "aiControlCenter.tab.infrastructure" },
  { id: "agents", labelKey: "aiControlCenter.tab.agents" },
  { id: "prompts", labelKey: "aiControlCenter.tab.prompts" },
  { id: "knowledge", labelKey: "aiControlCenter.tab.knowledge" },
  { id: "embeddings", labelKey: "aiControlCenter.tab.embeddings" },
  { id: "costs", labelKey: "aiControlCenter.tab.costs" },
  { id: "usage", labelKey: "aiControlCenter.tab.usage" },
  { id: "errors", labelKey: "aiControlCenter.tab.errors" },
  { id: "router", labelKey: "aiControlCenter.tab.router" },
  { id: "marketplace", labelKey: "aiControlCenter.tab.marketplace" },
  { id: "benchmark", labelKey: "aiControlCenter.tab.benchmark" },
  { id: "audit", labelKey: "aiControlCenter.tab.audit" },
];
