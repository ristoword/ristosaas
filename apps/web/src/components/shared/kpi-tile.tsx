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
        "flex min-h-[5.5rem] min-w-[10.5rem] flex-col justify-between rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4",
        highlight && "ring-1 ring-rw-accent/30",
        className,
      )}
    >
      {Icon && <Icon className={cn("mb-2 h-5 w-5 shrink-0", iconTone[tone])} aria-hidden />}
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug text-rw-muted [overflow-wrap:anywhere]">{label}</p>
        <p
          className={cn(
            "mt-1 font-display text-[clamp(1.125rem,1.5vw+0.5rem,1.875rem)] font-semibold leading-tight tracking-tight tabular-nums [overflow-wrap:anywhere]",
            valueTone[tone],
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
