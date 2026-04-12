"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Sparkles, User } from "lucide-react";
import { api } from "@/lib/api-client";

const inputCls = "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 pl-11 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none focus:ring-1 focus:ring-rw-accent";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Inserisci username e password."); return; }
    setLoading(true);
    setError("");
    try {
      await api.auth.login(username.trim(), password);
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Errore di rete. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-rw-bg" style={{ background: "radial-gradient(circle at top left, #272a3b 0%, #050712 55%)" }}>
      <div className="w-full max-w-md space-y-8 px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rw-accent/15 ring-1 ring-rw-accent/30">
            <Sparkles className="h-8 w-8 text-rw-accent" />
          </div>
          <h1 className="font-display text-3xl font-bold text-rw-ink">RistoSaaS</h1>
          <p className="mt-2 text-sm text-rw-muted">Il gestionale cloud per la ristorazione</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-rw-line bg-rw-surface p-6 space-y-4 shadow-xl">
            <div>
              <label className="block text-xs font-semibold text-rw-muted mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="es. owner, sala, cucina" className={inputCls} autoFocus />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-rw-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={inputCls} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rw-muted hover:text-rw-ink">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">{error}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-rw-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-rw-accent/85 disabled:opacity-50">
              {loading ? "Accesso in corso…" : "Accedi"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-rw-line bg-rw-surface/50 p-4">
          <p className="text-xs font-semibold text-rw-muted mb-2">Account demo:</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-rw-soft">
            {[
              { u: "owner", p: "owner123", r: "Owner" },
              { u: "sala", p: "sala123", r: "Sala" },
              { u: "cucina", p: "cucina123", r: "Cucina" },
              { u: "cassa", p: "cassa123", r: "Cassa" },
              { u: "supervisor", p: "super123", r: "Supervisor" },
              { u: "magazzino", p: "magazzino123", r: "Magazzino" },
              { u: "hotel", p: "hotel123", r: "Hotel Manager" },
              { u: "reception", p: "reception123", r: "Reception" },
            ].map((d) => (
              <button key={d.u} type="button" onClick={() => { setUsername(d.u); setPassword(d.p); }} className="rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-2 py-1.5 text-left hover:border-rw-accent/30">
                <span className="font-semibold text-rw-ink">{d.u}</span> <span className="text-rw-muted">· {d.r}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
