"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
};

export function Modal({ open, onClose, title, subtitle, children, wide }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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
        className={`flex max-h-[min(92dvh,920px)] w-full flex-col rounded-t-[1.75rem] border border-rw-line bg-rw-surface shadow-rw sm:max-h-[85dvh] sm:rounded-3xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-rw-line px-5 pb-4 pt-5 sm:px-6">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold text-rw-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-rw-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
