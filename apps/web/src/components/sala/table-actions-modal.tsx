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
import { useI18n } from "@/core/i18n/provider";

type TableActionsModalProps = {
  table: SalaTable | null;
  open: boolean;
  onClose: () => void;
  onSendOrder?: (table: SalaTable) => void;
  /** Invoked for wired actions (close, cancel, marcia, chiedi conto, libera). */
  onAction?: (id: AzioneId, table: SalaTable) => void | Promise<void>;
  /** Invoked for navigation actions (menu, menu giorno, bevande). */
  onNavigate?: (href: string) => void;
};

export type AzioneId =
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
  onAction,
  onNavigate,
}: TableActionsModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const [coperti, setCoperti] = useState(2);
  const [corsi, setCorsi] = useState(1);
  const [noteDest, setNoteDest] = useState<NoteDestinazione>("cucina");
  const [note, setNote] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const azioni: {
    id: AzioneId;
    label: string;
    icon: typeof UtensilsCrossed;
    tone?: "danger" | "success" | "accent";
  }[] = [
    { id: "apri-tavolo", label: t("sala.action.apriTavolo"), icon: DoorOpen, tone: "success" },
    { id: "cancella-tavolo", label: t("sala.action.cancellaTavolo"), icon: Trash2, tone: "danger" },
    { id: "prendi-ordine", label: t("sala.action.prendiOrdine"), icon: ClipboardList, tone: "accent" },
    { id: "menu-casa", label: "Menu della Casa", icon: BookOpen, tone: "accent" },
    { id: "menu-giorno", label: "Menu del Giorno", icon: CalendarDays, tone: "accent" },
    { id: "ordine-bevande", label: "Menu Bevande", icon: Wine, tone: "accent" },
    { id: "fuori-menu", label: t("sala.action.fuoriMenu"), icon: ScrollText },
    { id: "marcia-portata", label: t("sala.action.marciaPortata"), icon: Send, tone: "accent" },
    { id: "chiudi-tavolo", label: t("sala.action.chiudiTavolo"), icon: CircleDot },
    { id: "chiedi-conto", label: t("sala.action.chiediConto"), icon: Banknote, tone: "accent" },
    { id: "tavolo-libero", label: t("sala.action.tavoloLibero"), icon: UtensilsCrossed, tone: "success" },
  ];

  const destLabels: Record<NoteDestinazione, string> = {
    cucina: t("sala.modal.dest.cucina"),
    pizzeria: t("sala.modal.dest.pizzeria"),
    bar: t("sala.modal.dest.bar"),
  };

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
    const timer = window.setTimeout(() => setFlash(null), 2200);
    return () => window.clearTimeout(timer);
  }, [flash, open]);

  if (!open || !table) return null;

  const statoLabel = t(`sala.status.${table.stato}`);

  const orderActions: AzioneId[] = ["prendi-ordine", "menu-casa", "menu-giorno", "ordine-bevande"];

  const navActions: Record<AzioneId, string | null> = {
    "menu-casa": null,
    "menu-giorno": null,
    "fuori-menu": "/menu-admin",
    "ordine-bevande": null,
    "prendi-ordine": null,
    "marcia-portata": null,
    "chiudi-tavolo": null,
    "cancella-tavolo": null,
    "chiedi-conto": null,
    "tavolo-libero": null,
    "apri-tavolo": null,
  };

  async function simulaAzione(id: AzioneId, label: string) {
    if (orderActions.includes(id) && onSendOrder) {
      onSendOrder(table!);
      return;
    }
    const navHref = navActions[id];
    if (navHref) {
      onClose();
      if (onNavigate) onNavigate(navHref);
      else window.location.href = navHref;
      return;
    }
    const wiredActions: AzioneId[] = [
      "marcia-portata",
      "chiudi-tavolo",
      "cancella-tavolo",
      "chiedi-conto",
      "tavolo-libero",
      "apri-tavolo",
    ];
    if (onAction && wiredActions.includes(id)) {
      try {
        await onAction(id, table!);
        setFlash(t("sala.modal.flash.done").replace("{label}", label));
      } catch (error) {
        setFlash(
          t("sala.modal.flash.error")
            .replace("{label}", label)
            .replace("{msg}", error instanceof Error ? error.message : t("sala.modal.flash.errorDefault")),
        );
      }
      return;
    }
    setFlash(t("sala.modal.flash.done").replace("{label}", label));
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
              {t("sala.tableLabel")}
            </p>
            <h2 id={titleId} className="font-display text-2xl font-semibold text-rw-ink">
              {table.nome}
            </h2>
            <p className="mt-1 text-sm text-rw-muted">
              {t("sala.modal.tablePosti").replace("{n}", String(table.posti))}{" "}
              <span className="font-medium text-rw-ink">{statoLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rw-line bg-rw-surfaceAlt text-rw-ink"
            aria-label={t("ui.close")}
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
          <section aria-label={t("sala.modal.coversAndCourses")} className="mb-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-semibold text-rw-ink">{t("sala.modal.coversTitle")}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl border border-rw-line bg-rw-surface text-rw-ink active:bg-rw-surfaceAlt"
                  aria-label={t("sala.modal.coversLess")}
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
                  aria-label={t("sala.modal.coversMore")}
                  onClick={() => setCoperti((n) => Math.min(99, n + 1))}
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <p className="text-sm font-semibold text-rw-ink">{t("sala.modal.coursesTitle")}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl border border-rw-line bg-rw-surface text-rw-ink active:bg-rw-surfaceAlt"
                  aria-label={t("sala.modal.coursesLess")}
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
                  aria-label={t("sala.modal.coursesMore")}
                  onClick={() => setCorsi((n) => Math.min(12, n + 1))}
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            </div>
          </section>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rw-muted">
            {t("sala.modal.quickActions")}
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

          <section className="border-t border-rw-line pt-4" aria-label={t("sala.modal.notes.sectionLabel")}>
            <p className="text-sm font-semibold text-rw-ink">{t("sala.modal.notes.title")}</p>
            <p className="mt-1 text-xs text-rw-muted">
              {t("sala.modal.notes.subtitle")}
            </p>
            <div
              className="mt-3 grid grid-cols-3 gap-2"
              role="group"
              aria-label={t("sala.modal.notes.destination")}
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
              <span className="sr-only">{t("sala.modal.notes.srLabel")}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t("sala.modal.notes.placeholder")}
                className="w-full resize-y rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-base text-rw-ink placeholder:text-rw-muted"
              />
            </label>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rw-line bg-rw-surface py-4 text-base font-semibold text-rw-ink active:bg-rw-surfaceAlt"
              onClick={() =>
                simulaAzione(
                  "menu-casa",
                  `${t("sala.modal.notes.send")} (${destLabels[noteDest]})${note.trim() ? "" : ` (${t("sala.modal.notes.emptyLabel")})`}`,
                )
              }
            >
              <Soup className="h-5 w-5 text-rw-accent" aria-hidden />
              {t("sala.modal.notes.send")}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
