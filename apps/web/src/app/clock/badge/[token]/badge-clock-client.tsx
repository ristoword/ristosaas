"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2, LogIn, LogOut, XCircle } from "lucide-react";

type TodayShift = { id: string; clockInAt: string; clockOutAt: string | null };
type ActionResult = "success_in" | "success_out" | "error" | null;

type Props = {
  token: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  isClocked: boolean;
  todayShifts: TodayShift[];
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export function BadgeClockClient({ staffId, staffName, staffRole, isClocked: initialClocked, todayShifts: initialShifts }: Props) {
  const [clocked, setClocked] = useState(initialClocked);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<ActionResult>(null);
  const [shifts, setShifts] = useState(initialShifts);

  const now = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const day = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  // Auto-reset result overlay
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(t);
  }, [result]);

  async function handleClock() {
    if (acting) return;
    const action = clocked ? "clock_out" : "clock_in";
    setActing(true);
    try {
      const res = await fetch("/api/staff/shifts/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, action }),
      });
      if (res.ok) {
        const shift: { id: string; clockInAt: string; clockOutAt: string | null } = await res.json();
        setResult(action === "clock_in" ? "success_in" : "success_out");
        setClocked(action === "clock_in");
        setShifts((prev) => {
          const idx = prev.findIndex((s) => s.id === shift.id);
          if (idx >= 0) return prev.map((s, i) => (i === idx ? { id: shift.id, clockInAt: shift.clockInAt, clockOutAt: shift.clockOutAt } : s));
          return [{ id: shift.id, clockInAt: shift.clockInAt, clockOutAt: shift.clockOutAt }, ...prev];
        });
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setActing(false);
    }
  }

  // Full-screen confirmation overlay
  if (result) {
    const isSuccess = result !== "error";
    const isIn = result === "success_in";
    return (
      <div className={`fixed inset-0 flex flex-col items-center justify-center ${isSuccess ? (isIn ? "bg-emerald-900" : "bg-amber-900") : "bg-red-900"}`}>
        {isSuccess
          ? isIn ? <CheckCircle className="h-32 w-32 text-emerald-300 mb-6" /> : <LogOut className="h-32 w-32 text-amber-300 mb-6" />
          : <XCircle className="h-32 w-32 text-red-300 mb-6" />
        }
        <p className="text-white text-6xl font-black mb-4">{isSuccess ? (isIn ? "ENTRATA" : "USCITA") : "ERRORE"}</p>
        <p className="text-white/80 text-3xl font-semibold">{staffName}</p>
        <p className="text-white/60 text-2xl mt-1">{now}</p>
        <p className="text-white/30 text-sm mt-8">Chiusura automatica tra 4 secondi…</p>
      </div>
    );
  }

  const initials = staffName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 select-none">
      {/* Time header */}
      <div className="text-center mb-10">
        <p className="text-gray-400 text-base capitalize">{day}</p>
        <p className="text-white text-7xl font-black font-mono tracking-tight mt-1">{now}</p>
      </div>

      {/* Staff card */}
      <div className="flex flex-col items-center gap-5 w-full max-w-xs">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-4xl font-black text-white shadow-2xl shadow-violet-900/50">
          {initials}
        </div>
        <div className="text-center">
          <p className="text-white text-3xl font-bold">{staffName}</p>
          <p className="text-gray-400 capitalize text-lg mt-1">{staffRole}</p>
        </div>

        {/* State badge */}
        <div className={`rounded-full px-6 py-2.5 text-base font-bold ${clocked ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-gray-500"}`}>
          {clocked ? "● In servizio" : "○ Fuori servizio"}
        </div>

        {/* Main action button */}
        <button
          type="button"
          onClick={() => void handleClock()}
          disabled={acting}
          className={`w-full h-36 rounded-3xl text-4xl font-black text-white shadow-2xl transition-transform active:scale-95 disabled:opacity-50 ${
            clocked ? "bg-amber-500 hover:bg-amber-400 shadow-amber-900/40" : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-900/40"
          }`}
        >
          {acting
            ? <Loader2 className="h-12 w-12 animate-spin mx-auto" />
            : clocked
              ? <><LogOut className="inline h-9 w-9 mr-2 -mt-1" />USCITA</>
              : <><LogIn className="inline h-9 w-9 mr-2 -mt-1" />ENTRATA</>
          }
        </button>

        {/* Today's shifts mini log */}
        {shifts.length > 0 && (
          <div className="w-full rounded-2xl bg-gray-900 p-4 space-y-2">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Timbrature di oggi</p>
            {shifts.slice(0, 4).map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-emerald-400">⏎ {formatTime(s.clockInAt)}</span>
                {s.clockOutAt
                  ? <span className="text-amber-400">⏏ {formatTime(s.clockOutAt)}</span>
                  : <span className="text-gray-600">in corso…</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
