"use client";

import { cn } from "@/lib/utils";

type KdsColumnProps = {
  title: string;
  tone: "pending" | "prep" | "ready";
  count: number;
  children: React.ReactNode;
};

const toneStyles: Record<KdsColumnProps["tone"], { header: string; border: string }> = {
  pending: { header: "bg-amber-500/15 text-amber-300", border: "border-amber-500/20" },
  prep: { header: "bg-rw-accent/15 text-rw-accentSoft", border: "border-rw-accent/20" },
  ready: { header: "bg-emerald-500/15 text-emerald-300", border: "border-emerald-500/20" },
};

export function KdsColumn({ title, tone, count, children }: KdsColumnProps) {
  const s = toneStyles[tone];
  return (
    <div className={cn("flex flex-col rounded-2xl border", s.border)}>
      <div className={cn("flex items-center justify-between rounded-t-2xl px-4 py-3", s.header)}>
        <span className="text-sm font-bold uppercase tracking-wide">{title}</span>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">{count}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">{children}</div>
    </div>
  );
}
