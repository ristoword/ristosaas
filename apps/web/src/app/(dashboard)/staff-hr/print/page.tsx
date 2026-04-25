"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { staffApi, type StaffMember, type StaffShift } from "@/lib/api-client";
import { addDaysIso, todayIso } from "@/lib/date-utils";

function computeDuration(shift: StaffShift): number {
  if (shift.durationHours !== null) return shift.durationHours;
  if (!shift.clockOutAt) return 0;
  const ms = new Date(shift.clockOutAt).getTime() - new Date(shift.clockInAt).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

export default function PrintPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);

  const today = todayIso();
  const monthStart = today.slice(0, 7) + "-01";
  const monthLabel = new Date(monthStart + "T12:00:00").toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const load = useCallback(async () => {
    const [staffRows, shiftRows] = await Promise.all([
      staffApi.list(),
      staffApi.listShifts({ from: monthStart, to: addDaysIso(today, 1) }),
    ]);
    setStaff(staffRows);
    setShifts(shiftRows);
    setLoading(false);
  }, [monthStart, today]);

  useEffect(() => { void load(); }, [load]);

  const aggregates = useMemo(() => {
    return staff.map((s) => {
      const myShifts = shifts.filter((sh) => sh.staffId === s.id);
      const hours = myShifts.reduce((sum, sh) => sum + computeDuration(sh), 0);
      const contractH = (s.hoursWeek ?? 40) * 4;
      return {
        name: s.name, role: s.role, status: s.status,
        hours, contractH, diff: hours - contractH,
        shifts: myShifts.length,
      };
    });
  }, [staff, shifts]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-gray-100 px-6 py-3 border-b border-gray-200">
        <div>
          <p className="font-semibold text-gray-900">Stampa presenze — {monthLabel}</p>
          <p className="text-xs text-gray-500">Usa Ctrl+P / Cmd+P per salvare come PDF</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.history.back()}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200">
            ← Torna
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Printer className="h-4 w-4" /> Stampa / Salva PDF
          </button>
        </div>
      </div>

      <div className="pt-20 no-print:pt-20 px-8 pb-8 max-w-5xl mx-auto">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Riepilogo Presenze</h1>
          <p className="text-gray-500">{monthLabel} · {staff.length} dipendenti</p>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Dipendente</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Ruolo</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Stato</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Turni</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Ore lavorate</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Contratto (mese)</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Differenza</th>
            </tr>
          </thead>
          <tbody>
            {aggregates.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 px-3 py-2 font-medium">{r.name}</td>
                <td className="border border-gray-300 px-3 py-2 capitalize text-gray-600">{r.role}</td>
                <td className="border border-gray-300 px-3 py-2 capitalize text-gray-600">{r.status}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{r.shifts}</td>
                <td className="border border-gray-300 px-3 py-2 text-right font-mono">{r.hours.toFixed(1)}h</td>
                <td className="border border-gray-300 px-3 py-2 text-right text-gray-500">{r.contractH}h</td>
                <td className={`border border-gray-300 px-3 py-2 text-right font-semibold ${r.diff >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {r.diff >= 0 ? "+" : ""}{r.diff.toFixed(1)}h
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td colSpan={4} className="border border-gray-300 px-3 py-2">Totale</td>
              <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                {aggregates.reduce((s, r) => s + r.hours, 0).toFixed(1)}h
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {aggregates.reduce((s, r) => s + r.contractH, 0)}h
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {(() => { const d = aggregates.reduce((s, r) => s + r.diff, 0); return `${d >= 0 ? "+" : ""}${d.toFixed(1)}h`; })()}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 text-xs text-gray-400">
          Generato il {new Date().toLocaleDateString("it-IT")} — RistoWord Staff HR
        </div>
      </div>
    </>
  );
}
