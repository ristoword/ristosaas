"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

type ToastKind = "ok" | "err";
type ToastState = { kind: ToastKind; message: string } | null;

export function useToast(autoHideMs = 4000) {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), autoHideMs);
    return () => clearTimeout(t);
  }, [toast, autoHideMs]);

  const showOk = useCallback((message: string) => setToast({ kind: "ok", message }), []);
  const showErr = useCallback((message: string) => setToast({ kind: "err", message }), []);
  const dismiss = useCallback(() => setToast(null), []);

  return { toast, showOk, showErr, dismiss };
}

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss?: () => void }) {
  if (!toast) return null;
  const isOk = toast.kind === "ok";
  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl transition-all ${
        isOk
          ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-200"
          : "border-red-500/30 bg-red-950/90 text-red-200"
      }`}
    >
      {isOk ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <p className="text-sm">{toast.message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
