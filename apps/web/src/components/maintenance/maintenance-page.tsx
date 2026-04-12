"use client";

import { RefreshCw, Wrench } from "lucide-react";

/** preview/mock page: maintenance fallback */
export function MaintenancePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-rw-bg" style={{ background: "radial-gradient(circle at top left, #272a3b 0%, #050712 55%)" }}>
      <div className="text-center space-y-6 px-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/30">
          <Wrench className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="font-display text-3xl font-bold text-rw-ink">Manutenzione in corso</h1>
        <p className="max-w-md text-sm text-rw-muted">Il sistema è temporaneamente in manutenzione per aggiornamenti. Torneremo operativi a breve.</p>
        <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-5 py-3 text-sm font-semibold text-rw-soft hover:text-rw-ink">
          <RefreshCw className="h-4 w-4" /> Riprova
        </button>
        <p className="text-xs text-rw-muted">Se sei un super admin, <a href="/super-admin" className="text-rw-accent hover:underline">accedi qui</a>.</p>
      </div>
    </div>
  );
}
