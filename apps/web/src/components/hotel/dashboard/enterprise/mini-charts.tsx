"use client";

import { cn } from "@/lib/utils";

export function MiniBarChart({
  data,
  className,
}: {
  data: Array<{ date: string; value: number }>;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex h-28 items-end gap-1", className)}>
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-[#D4AF37]/80 to-[#D4AF37]/30 transition-all duration-[180ms]"
            style={{ height: `${Math.max(8, (d.value / max) * 100)}%` }}
            title={`${d.date}: ${d.value}%`}
          />
          <span className="text-[9px] text-rw-muted tabular-nums">{d.date.slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

export function MiniDonutChart({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const gradient = segments
    .map((s) => {
      const start = (acc / total) * 100;
      acc += s.value;
      const end = (acc / total) * 100;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-28 w-28 shrink-0 rounded-full shadow-inner"
        style={{ background: total > 0 ? `conic-gradient(${gradient})` : "conic-gradient(#334155 0% 100%)" }}
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-rw-surfaceAlt text-center">
          <span className="text-[10px] uppercase text-rw-muted">Tot</span>
          <span className="font-display text-sm font-bold text-[#E8C547]">€ {total.toFixed(0)}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-rw-soft">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-semibold tabular-nums text-rw-ink">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
