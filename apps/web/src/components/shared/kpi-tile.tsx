import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warn" | "danger" | "info";
  highlight?: boolean;
  className?: string;
};

const valueTone: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-rw-ink",
  success: "text-emerald-400",
  warn: "text-amber-400",
  danger: "text-red-400",
  info: "text-blue-400",
};

const iconTone: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-rw-accent",
  success: "text-emerald-400",
  warn: "text-amber-400",
  danger: "text-red-400",
  info: "text-blue-400",
};

export function KpiTile({ label, value, icon: Icon, tone = "default", highlight, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4 min-h-[5.5rem] flex flex-col justify-between",
        highlight && "ring-1 ring-rw-accent/30",
        className,
      )}
    >
      {Icon && <Icon className={cn("mb-2 h-5 w-5 shrink-0", iconTone[tone])} aria-hidden />}
      <div>
        <p className="text-sm font-medium text-rw-muted">{label}</p>
        <p className={cn("font-display text-3xl font-semibold tracking-tight", valueTone[tone])}>{value}</p>
      </div>
    </div>
  );
}
