"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import {
  QUICK_START,
  ROLE_GUIDE,
  SECTIONS,
  type ManualSection,
} from "@/lib/manuale/sections";

/* ================================================================== */
/*  Component: collapsible section                                     */
/* ================================================================== */


function ManualSectionCard({ section, isOpen, onToggle }: {
  section: ManualSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surface shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-4 px-5 py-4 text-left transition",
          isOpen ? "bg-gradient-to-r " + section.color : "hover:bg-rw-surfaceAlt/50",
        )}
      >
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-rw-line", isOpen ? "bg-rw-accent/15 ring-rw-accent/30" : "bg-rw-surfaceAlt")}>
          <Icon className={cn("h-5 w-5", isOpen ? "text-rw-accent" : "text-rw-muted")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-rw-ink text-sm">{section.title}</p>
          <p className="text-xs text-rw-muted truncate">{section.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-wrap gap-1">
            {section.roles.map((r) => (
              <span key={r} className="rounded-full border border-rw-line bg-rw-surfaceAlt px-2 py-0.5 text-[10px] font-medium text-rw-muted">{r}</span>
            ))}
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4 text-rw-muted" /> : <ChevronRight className="h-4 w-4 text-rw-muted" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-rw-line px-5 py-5 space-y-5">
          <div className="flex flex-wrap gap-1 sm:hidden">
            {section.roles.map((r) => (
              <span key={r} className="rounded-full border border-rw-line bg-rw-surfaceAlt px-2 py-0.5 text-[10px] font-medium text-rw-muted">{r}</span>
            ))}
          </div>
          {section.content.map((block, i) => (
            <div key={i}>
              <h3 className="text-sm font-bold text-rw-ink mb-2">{block.heading}</h3>
              <div className="text-sm text-rw-soft leading-relaxed whitespace-pre-line">{block.body}</div>
              {block.tips && block.tips.length > 0 && (
                <div className="mt-3 rounded-xl border border-rw-accent/20 bg-rw-accent/5 p-3">
                  <p className="text-xs font-bold text-rw-accent mb-1.5">💡 Consigli</p>
                  <ul className="space-y-1">
                    {block.tips.map((tip, j) => (
                      <li key={j} className="text-xs text-rw-soft pl-3 relative before:absolute before:left-0 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-rw-accent/50">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ================================================================== */
/*  Main page                                                          */
/* ================================================================== */

export function ManualePage() {
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(SECTIONS.map((s) => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  const q = search.trim().toLowerCase();
  const filtered = q
    ? SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.subtitle.toLowerCase().includes(q) ||
          s.content.some(
            (b) =>
              b.heading.toLowerCase().includes(q) ||
              b.body.toLowerCase().includes(q) ||
              b.tips?.some((t) => t.toLowerCase().includes(q)),
          ),
      )
    : SECTIONS;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Manuale Utente"
        subtitle="Guida completa per usare al meglio RistoSimply — tutte le funzioni spiegate."
      >
        <div className="flex items-center gap-2">
          <button type="button" onClick={expandAll} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-muted hover:text-rw-ink">
            Espandi tutto
          </button>
          <button type="button" onClick={collapseAll} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs font-semibold text-rw-muted hover:text-rw-ink">
            Chiudi tutto
          </button>
        </div>
      </PageHeader>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca nel manuale… (es. magazzino, ordini, cantina, turni)"
          className="w-full rounded-2xl border border-rw-line bg-rw-surfaceAlt py-3 pl-10 pr-4 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none"
        />
      </div>

      {/* Quick Start */}
      {!q && (
        <div className="rounded-2xl border border-rw-accent/20 bg-gradient-to-br from-rw-accent/10 to-rw-accent/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-accent/15 ring-1 ring-rw-accent/30">
              <BookOpen className="h-5 w-5 text-rw-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-rw-ink">Guida Rapida — 6 passi per iniziare</h2>
              <p className="text-xs text-rw-muted">Il flusso base di una giornata tipo nel ristorante.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_START.map((s) => (
              <div key={s.step} className="flex items-start gap-3 rounded-xl bg-rw-surface/60 p-3 border border-rw-line/50">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rw-accent text-xs font-bold text-white">{s.step}</span>
                <div>
                  <p className="text-xs font-bold text-rw-ink">{s.title}</p>
                  <p className="text-[11px] text-rw-muted leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Guide */}
      {!q && (
        <div className="rounded-2xl border border-rw-line bg-rw-surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rw-surfaceAlt ring-1 ring-rw-line">
              <Users className="h-5 w-5 text-rw-muted" />
            </div>
            <div>
              <h2 className="text-base font-bold text-rw-ink">Cosa vede ogni ruolo</h2>
              <p className="text-xs text-rw-muted">Ogni utente vede solo le pagine del proprio ruolo.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_GUIDE.map((r) => (
              <div key={r.role} className={cn("flex items-center gap-3 rounded-xl border p-3", r.color)}>
                <span className="text-xs font-bold whitespace-nowrap">{r.role}</span>
                <span className="text-[11px] opacity-80">{r.pages}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All sections */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HelpCircle className="h-12 w-12 text-rw-muted/30 mb-3" />
            <p className="text-sm text-rw-muted">Nessun risultato per &quot;{search}&quot;</p>
            <p className="text-xs text-rw-muted mt-1">Prova con un termine diverso.</p>
          </div>
        )}
        {filtered.map((section) => (
          <ManualSectionCard
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id) || (q.length > 0 && filtered.length <= 3)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="rounded-2xl border border-rw-line bg-rw-surface p-5 text-center">
        <p className="text-xs text-rw-muted">
          Hai bisogno di assistenza? Contatta il supporto tecnico o usa l&apos;AI Assistente per domande operative.
        </p>
        <p className="text-[10px] text-rw-muted mt-1">RistoSimply — Manuale v1.0</p>
      </div>
    </div>
  );
}
