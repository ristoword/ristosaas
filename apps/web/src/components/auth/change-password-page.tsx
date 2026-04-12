"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

const inputCls = "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";

export function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) { setFlash({ type: "error", msg: "Inserisci la password attuale." }); return; }
    if (newPw.length < 6) { setFlash({ type: "error", msg: "La nuova password deve avere almeno 6 caratteri." }); return; }
    if (newPw !== confirm) { setFlash({ type: "error", msg: "Le password non coincidono." }); return; }
    setLoading(true);
    try {
      await api.auth.changePassword(current, newPw);
      setFlash({ type: "success", msg: "Password cambiata con successo." });
      setCurrent(""); setNewPw(""); setConfirm("");
    } catch (error) {
      setFlash({ type: "error", msg: error instanceof Error ? error.message : "Errore di rete." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-rw-bg" style={{ background: "radial-gradient(circle at top left, #272a3b 0%, #050712 55%)" }}>
      <div className="w-full max-w-md space-y-6 px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rw-accent/15 ring-1 ring-rw-accent/30">
            <Shield className="h-7 w-7 text-rw-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-rw-ink">Cambia Password</h1>
          <p className="mt-1 text-sm text-rw-muted">Aggiorna le credenziali di accesso</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-rw-line bg-rw-surface p-6 space-y-4 shadow-xl">
          {flash && (
            <div className={cn("rounded-lg border px-3 py-2 text-xs font-semibold", flash.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400")}>{flash.msg}</div>
          )}
          <div><label className="block text-xs font-semibold text-rw-muted mb-1">Password attuale</label><input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Password attuale" className={inputCls} /></div>
          <div><label className="block text-xs font-semibold text-rw-muted mb-1">Nuova password</label><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Minimo 6 caratteri" className={inputCls} /></div>
          <div><label className="block text-xs font-semibold text-rw-muted mb-1">Conferma</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ripeti password" className={inputCls} /></div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-rw-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-rw-accent/85 disabled:opacity-50">{loading ? "Salvataggio…" : "Cambia password"}</button>
        </form>

        <p className="text-center text-xs text-rw-muted">
          <button type="button" onClick={() => router.push("/login")} className="inline-flex items-center gap-1 text-rw-accent hover:underline"><ArrowLeft className="h-3 w-3" /> Torna al login</button>
        </p>
      </div>
    </div>
  );
}
