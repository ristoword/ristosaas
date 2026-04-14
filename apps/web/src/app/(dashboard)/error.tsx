"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { captureException } from "@/lib/observability/sentry-lite";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    void captureException({
      source: "client",
      message: error.message || "Dashboard error",
      stack: error.stack,
      tags: { boundary: "dashboard-error" },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/30">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-rw-ink">Qualcosa è andato storto</h2>
        <p className="text-sm text-rw-muted">{error.message || "Errore imprevisto. Riprova."}</p>
        <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-3 text-sm font-bold text-white hover:bg-rw-accent/85">
          <RefreshCw className="h-4 w-4" /> Riprova
        </button>
      </div>
    </div>
  );
}
