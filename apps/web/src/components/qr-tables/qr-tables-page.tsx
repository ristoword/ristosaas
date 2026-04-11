"use client";

import { Printer, QrCode } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";

const mockTables = Array.from({ length: 12 }, (_, i) => ({
  id: `t${i + 1}`,
  number: i + 1,
  label: `Tavolo ${i + 1}`,
  area: i < 6 ? "Sala" : i < 9 ? "Terrazza" : "Privé",
}));

export function QrTablesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="QR Tavoli" subtitle="Genera e stampa i codici QR per ogni tavolo">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]"
        >
          <Printer className="h-4 w-4" />
          Stampa tutti
        </button>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <Chip label="Tavoli" value={mockTables.length} tone="default" />
        <Chip label="Sala" value={mockTables.filter((t) => t.area === "Sala").length} tone="info" />
        <Chip label="Terrazza" value={mockTables.filter((t) => t.area === "Terrazza").length} tone="success" />
        <Chip label="Privé" value={mockTables.filter((t) => t.area === "Privé").length} tone="accent" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {mockTables.map((table) => (
          <div
            key={table.id}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-rw-line bg-rw-surface p-5 text-center transition hover:border-rw-accent/30 hover:shadow-lg"
          >
            {/* QR placeholder */}
            <div className="flex h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed border-rw-line bg-rw-surfaceAlt transition group-hover:border-rw-accent/40">
              <div className="flex flex-col items-center gap-1">
                <QrCode className="h-8 w-8 text-rw-muted group-hover:text-rw-accent" />
                <span className="font-display text-2xl font-bold text-rw-ink">{table.number}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-rw-ink">{table.label}</p>
              <p className="text-xs text-rw-muted">{table.area}</p>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rw-line px-3 py-1.5 text-xs font-semibold text-rw-soft opacity-0 transition hover:text-rw-ink group-hover:opacity-100"
            >
              <Printer className="h-3 w-3" />
              Stampa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
