"use client";

import { Bell, Menu, Search } from "lucide-react";

type TopBarProps = {
  onOpenSidebar: () => void;
  menuOpen: boolean;
};

export function TopBar({ onOpenSidebar, menuOpen }: TopBarProps) {
  const today = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 border-b border-rw-line bg-rw-surface/90 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-6xl items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rw-line bg-rw-surfaceAlt text-rw-ink shadow-sm md:hidden"
          aria-controls="app-sidebar"
          aria-expanded={menuOpen}
          aria-label="Apri o chiudi menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold text-rw-ink md:text-xl">
            Buongiorno, squadra
          </p>
          <p className="truncate text-sm text-rw-muted capitalize">{today}</p>
        </div>

        <div className="hidden min-w-0 flex-1 md:block">
          <label className="sr-only" htmlFor="global-search">
            Cerca in RistoWord
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rw-muted"
              aria-hidden
            />
            <input
              id="global-search"
              name="q"
              readOnly
              placeholder="Cerca ovunque: tavolo, cliente, piatto…"
              className="h-12 w-full cursor-not-allowed rounded-2xl border border-rw-line bg-rw-surfaceAlt pl-12 pr-4 text-sm text-rw-muted"
              title="La ricerca globale si collegherà ai moduli."
            />
          </div>
        </div>

        <button
          type="button"
          className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rw-line bg-rw-surface text-rw-ink shadow-sm transition hover:border-rw-accent/40 hover:bg-rw-surfaceAlt"
          aria-label="Notifiche (in arrivo)"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rw-accent" />
        </button>

        <div
          className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rw-accent to-rw-accentSoft text-sm font-semibold text-white shadow-rw-sm sm:flex"
          aria-label="Profilo utente (placeholder)"
        >
          TU
        </div>
      </div>
    </header>
  );
}
