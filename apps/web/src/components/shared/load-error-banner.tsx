"use client";

import { AlertTriangle } from "lucide-react";

type Props = { message: string | null };

export function LoadErrorBanner({ message }: Props) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      <p className="text-sm text-amber-300">
        <span className="font-semibold">Errore di connessione:</span> {message} — ricarica la pagina o controlla la connessione.
      </p>
    </div>
  );
}
