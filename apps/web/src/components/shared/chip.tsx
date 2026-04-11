import { cn } from "@/lib/utils";

type ChipProps = {
  label: string;
  value?: string | number;
  tone?: "default" | "accent" | "success" | "danger" | "warn" | "info";
  className?: string;
};

const toneMap: Record<NonNullable<ChipProps["tone"]>, string> = {
  default: "border-rw-line bg-rw-surfaceAlt text-rw-soft",
  accent: "border-rw-accent/30 bg-rw-accent/10 text-rw-accent",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  danger: "border-red-500/30 bg-red-500/10 text-red-400",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
};

export function Chip({ label, value, tone = "default", className }: ChipProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold", toneMap[tone], className)}>
      <span className="uppercase tracking-wide opacity-70">{label}</span>
      {value != null && <span>{value}</span>}
    </span>
  );
}
