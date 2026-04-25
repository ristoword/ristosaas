"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Loader2, LogIn, LogOut, XCircle } from "lucide-react";

type StaffInfo = { id: string; name: string; role: string } | null;
type ShiftState = "unknown" | "clocked_in" | "clocked_out";
type ActionResult = "success_in" | "success_out" | "error" | null;

export default function ClockPage() {
  const [staff, setStaff] = useState<StaffInfo>(null);
  const [shiftState, setShiftState] = useState<ShiftState>("unknown");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<ActionResult>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user's staff record
      const meRes = await fetch("/api/staff/me");
      if (!meRes.ok) {
        setError("Devi essere loggato per timbrare. Apri l'app e accedi prima.");
        return;
      }
      const me = await meRes.json();
      if (!me) {
        setError("Account non collegato a nessun dipendente. Chiedi al responsabile di collegare il tuo account.");
        return;
      }
      setStaff(me);

      // Check today's shifts to determine state
      const today = new Date().toISOString().slice(0, 10);
      const shiftsRes = await fetch(`/api/staff/shifts?staffId=${me.id}&from=${today}&to=${today}`);
      if (shiftsRes.ok) {
        const shifts: Array<{ clockInAt: string; clockOutAt: string | null }> = await shiftsRes.json();
        const openShift = shifts.find((s) => !s.clockOutAt);
        setShiftState(openShift ? "clocked_in" : "clocked_out");
      }
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Auto-reset result after 4 seconds
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => { setResult(null); void load(); }, 4000);
    return () => clearTimeout(t);
  }, [result, load]);

  async function handleClock() {
    if (!staff || acting) return;
    const action = shiftState === "clocked_in" ? "clock_out" : "clock_in";
    setActing(true);
    try {
      const res = await fetch("/api/staff/shifts/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staff.id, action }),
      });
      if (res.ok) {
        setResult(action === "clock_in" ? "success_in" : "success_out");
        setShiftState(action === "clock_in" ? "clocked_in" : "clocked_out");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Errore timbratura");
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setActing(false);
    }
  }

  const now = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const day = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  // Full-screen result overlay
  if (result) {
    const isSuccess = result !== "error";
    const isIn = result === "success_in";
    return (
      <div className={`fixed inset-0 flex flex-col items-center justify-center ${isSuccess ? (isIn ? "bg-emerald-900" : "bg-amber-900") : "bg-red-900"}`}>
        {isSuccess
          ? isIn
            ? <CheckCircle className="h-32 w-32 text-emerald-300 mb-6" />
            : <LogOut className="h-32 w-32 text-amber-300 mb-6" />
          : <XCircle className="h-32 w-32 text-red-300 mb-6" />
        }
        <p className="text-white text-5xl font-bold mb-3">
          {isSuccess ? (isIn ? "ENTRATA" : "USCITA") : "ERRORE"}
        </p>
        {staff && <p className="text-white/80 text-2xl">{staff.name}</p>}
        <p className="text-white/60 text-xl mt-2">{now}</p>
        <p className="text-white/40 text-sm mt-6">Chiusura automatica…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 select-none">
      {/* Header */}
      <div className="text-center mb-12">
        <p className="text-gray-400 text-lg capitalize">{day}</p>
        <p className="text-white text-6xl font-bold font-mono mt-1">{now}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-gray-500 animate-spin" />
          <p className="text-gray-400">Caricamento…</p>
        </div>
      ) : error ? (
        <div className="text-center max-w-sm">
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl font-semibold mb-2">Accesso richiesto</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <a href="/login" className="mt-6 inline-block rounded-2xl bg-white px-8 py-4 text-lg font-bold text-gray-900 hover:opacity-90">
            Accedi
          </a>
        </div>
      ) : staff ? (
        <div className="flex flex-col items-center gap-8 w-full max-w-xs">
          {/* Staff info */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-rw-accent to-rw-accentSoft text-3xl font-bold text-white shadow-xl">
              {staff.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("")}
            </div>
            <p className="text-white text-2xl font-bold">{staff.name}</p>
            <p className="text-gray-400 capitalize mt-1">{staff.role}</p>
          </div>

          {/* Current state badge */}
          <div className={`rounded-full px-6 py-2 text-sm font-semibold ${shiftState === "clocked_in" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-gray-400"}`}>
            {shiftState === "clocked_in" ? "● In servizio" : "○ Fuori servizio"}
          </div>

          {/* Main button */}
          <button
            type="button"
            onClick={() => void handleClock()}
            disabled={acting}
            className={`w-full h-32 rounded-3xl text-3xl font-black text-white shadow-2xl transition-transform active:scale-95 disabled:opacity-50 ${
              shiftState === "clocked_in"
                ? "bg-amber-500 hover:bg-amber-400"
                : "bg-emerald-500 hover:bg-emerald-400"
            }`}
          >
            {acting
              ? <Loader2 className="h-10 w-10 animate-spin mx-auto" />
              : shiftState === "clocked_in"
                ? <><LogOut className="inline h-8 w-8 mr-2 -mt-1" />USCITA</>
                : <><LogIn className="inline h-8 w-8 mr-2 -mt-1" />ENTRATA</>
            }
          </button>

          <p className="text-gray-600 text-xs text-center">
            Avvicina il telefono all&apos;etichetta NFC all&apos;ingresso<br />
            o scansiona il QR per timbrare
          </p>
        </div>
      ) : null}
    </div>
  );
}
