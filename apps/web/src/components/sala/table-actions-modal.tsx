"use client";

import { useEffect, useId, useState } from "react";
import {
  Banknote,
  BookOpen,
  CalendarDays,
  ChefHat,
  CircleDot,
  ClipboardList,
  Coffee,
  DoorOpen,
  Minus,
  Pizza,
  Plus,
  ScrollText,
  Send,
  Soup,
  Trash2,
  UtensilsCrossed,
  Wine,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteDestinazione, SalaTable } from "./types";

type TableActionsModalProps = {
  table: SalaTable | null;
  open: boolean;
  onClose: () => void;
  onSendOrder?: (table: SalaTable) => void;
};

type AzioneId =
  | "apri-tavolo"
  | "cancella-tavolo"
  | "prendi-ordine"
  | "menu-casa"
  | "menu-giorno"
  | "fuori-menu"
  | "marcia-portata"
  | "chiudi-tavolo"
  | "chiedi-conto"
  | "tavolo-libero"
  | "ordine-bevande";

const azioni: {
  id: AzioneId;
  label: string;
  icon: typeof UtensilsCrossed;
  tone?: "danger" | "success" | "accent";
}[] = [
  { id: "apri-tavolo", label: "Apri tavolo", icon: DoorOpen, tone: "success" },
  { id: "cancella-tavolo", label: "Cancella tavolo", icon: Trash2, tone: "danger" },
  { id: "prendi-ordine", label: "Nuova comanda", icon: ClipboardList, tone: "accent" },
  { id: "menu-casa", label: "Apri menu della casa", icon: BookOpen },
  { id: "menu-giorno", label: "Menu del giorno", icon: CalendarDays },
  { id: "fuori-menu", label: "Piatti fuori menu", icon: ScrollText },
  { id: "marcia-portata", label: "Marcia prossima portata", icon: Send, tone: "accent" },
  { id: "chiudi-tavolo", label: "Chiudi tavolo", icon: CircleDot },
  { id: "chiedi-conto", label: "Chiedi conto", icon: Banknote, tone: "accent" },
  { id: "tavolo-libero", label: "Tavolo libero", icon: UtensilsCrossed, tone: "success" },
  { id: "ordine-bevande", label: "Ordine bevande", icon: Wine },
];

const destLabels: Record<NoteDestinazione, string> = {
  cucina: "Cucina",
  pizzeria: "Pizzeria",
  bar: "Bar",
};

const destIcons: Record<NoteDestinazione, typeof ChefHat> = {
  cucina: ChefHat,
  pizzeria: Pizza,
  bar: Coffee,
};

export function TableActionsModal({
  table,
  open,
  onClose,
  onSendOrder,
}: TableActionsModalProps) {
  const titleId = useId();
  const [coperti, setCoperti] = useState(2);
  const [corsi, setCorsi] = useState(1);
  const [noteDest, setNoteDest] = useState<NoteDestinazione>("cucina");
  const [note, setNote] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!table) return;
    setCoperti(table.posti);
    setCorsi(1);
    setNote("");
    setFlash(null);
  }, [table]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !flash) return;
    const t = window.setTimeout(() => setFlash(null), 2200);
    return () => window.clearTimeout(t);
  }, [flash, open]);

  if (!open || !table) return null;

  const statoLabel =
    table.stato === "libero"
      ? "Libero"
      : table.stato === "aperto"
        ? "Aperto"
        : table.stato === "conto"
          ? "Conto"
          : "Da pulire";

  function simulaAzione(id: AzioneId, label: string) {
    if (id === "prendi-ordine" && onSendOrder) {
      onSendOrder(table!);
      return;
    }
    setFlash(`«${label}» — collegamento al backend in arrivo.`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(92dvh,920px)] w-full max-w-lg flex-col rounded-t-[1.75rem] border border-rw-line bg-rw-surface shadow-rw sm:max-h-[85dvh] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-rw-line px-5 pb-4 pt-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">
              Tavolo
            </p>
            <h2 id={titleId} className="font-display text-2xl font-semibold text-rw-ink">
              {table.nome}
            </h2>
            <p className="mt-1 text-sm text-rw-muted">
              {table.posti} posti · stato:{" "}
              <span className="font-medium text-rw-ink">{statoLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rw-line bg-rw-surfaceAlt text-rw-ink"
            aria-label="Chiudi"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        {flash ? (
          <p
            className="mx-5 mt-3 rounded-2xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-3 text-sm text-rw-ink sm:mx-6"
            role="status"
          >
            {flash}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          <section aria-label="Coperti e corsi" className="mb-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-semibold text-rw-ink">Numero coperti</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl border border-rw-line bg-rw-surface text-rw-ink active:bg-rw-surfaceAlt"
                  aria-label="Meno coperti"
                  onClick={() => setCoperti((n) => Math.max(1, n - 1))}
                >
                  <Minus className="h-6 w-6" />
                </button>
                <span className="font-display text-3xl font-semibold tabular-nums text-rw-ink">
                  {coperti}
                </span>
                <button
                  type="button"
                  className="inline-flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl border border-rw-line bg-rw-surface text-rw-ink active:bg-rw-surfaceAlt"
                  aria-label="Più coperti"
                  onClick={() => setCoperti((n) => Math.min(99, n + 1))}
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-semibold text-rw-ink">Numero di corsi</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl border border-rw-line bg-rw-surface text-rw-ink active:bg-rw-surfaceAlt"
                  aria-label="Meno corsi"
                  onClick={() => setCorsi((n) => Math.max(1, n - 1))}
                >
                  <Minus className="h-6 w-6" />
                </button>
                <span className="font-display text-3xl font-semibold tabular-nums text-rw-ink">
                  {corsi}
                </span>
                <button
                  type="button"
                  className="inline-flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl border border-rw-line bg-rw-surface text-rw-ink active:bg-rw-surfaceAlt"
                  aria-label="Più corsi"
                  onClick={() => setCorsi((n) => Math.min(12, n + 1))}
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            </div>
          </section>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rw-muted">
            Azioni rapide
          </p>
          <ul className="grid grid-cols-1 gap-2 pb-4 sm:grid-cols-2">
            {azioni.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => simulaAzione(a.id, a.label)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-base font-semibold transition active:scale-[0.99]",
                      a.tone === "danger" &&
                        "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
                      a.tone === "success" &&
                        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
                      a.tone === "accent" &&
                        "border-rw-accent/35 bg-rw-accent/10 text-rw-ink hover:bg-rw-accent/15",
                      !a.tone &&
                        "border-rw-line bg-rw-surfaceAlt text-rw-ink hover:border-rw-accent/30 hover:bg-rw-surface",
                    )}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-rw-accent shadow-sm">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="leading-snug">{a.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <section className="border-t border-rw-line pt-4" aria-label="Note per reparti">
            <p className="text-sm font-semibold text-rw-ink">Note per cucina, pizzeria o bar</p>
            <p className="mt-1 text-xs text-rw-muted">
              Scegli dove arriva la nota, poi scrivi in modo semplice.
            </p>
            <div
              className="mt-3 grid grid-cols-3 gap-2"
              role="group"
              aria-label="Destinazione nota"
            >
              {(Object.keys(destLabels) as NoteDestinazione[]).map((d) => {
                const DIcon = destIcons[d];
                const active = noteDest === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNoteDest(d)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-semibold transition active:scale-[0.98]",
                      active
                        ? "border-rw-accent bg-rw-accent/15 text-rw-ink"
                        : "border-rw-line bg-rw-surfaceAlt text-rw-muted hover:border-rw-accent/25",
                    )}
                  >
                    <DIcon className="h-6 w-6" aria-hidden />
                    {destLabels[d]}
                  </button>
                );
              })}
            </div>
            <label className="mt-3 block">
              <span className="sr-only">Testo nota</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Esempio: senza aglio, pizza tonda, ghiaccio poco…"
                className="w-full resize-y rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-base text-rw-ink placeholder:text-rw-muted"
              />
            </label>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rw-line bg-rw-surface py-4 text-base font-semibold text-rw-ink active:bg-rw-surfaceAlt"
              onClick={() =>
                simulaAzione(
                  "menu-casa",
                  `Invia nota (${destLabels[noteDest]})${note.trim() ? "" : " (vuota)"}`,
                )
              }
            >
              <Soup className="h-5 w-5 text-rw-accent" aria-hidden />
              Invia nota
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
