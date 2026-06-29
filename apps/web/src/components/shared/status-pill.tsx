import { cn } from "@/lib/utils";

export type StatusPillTone = "default" | "accent" | "success" | "danger" | "warn" | "info";

const toneMap: Record<StatusPillTone, string> = {
  default: "border-rw-line bg-rw-surfaceAlt text-rw-soft",
  accent: "border-rw-accent/30 bg-rw-accent/10 text-rw-accent",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  danger: "border-red-500/30 bg-red-500/10 text-red-400",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
};

type Props = {
  children: React.ReactNode;
  tone?: StatusPillTone;
  className?: string;
};

export function StatusPill({ children, tone = "default", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
