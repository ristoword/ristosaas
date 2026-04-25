"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { shiftPlansApi, type ShiftPlan } from "@/lib/api-client";
import { Card } from "@/components/shared/card";

type Props = { area: string };

export function AreaTurniTab({ area }: Props) {
  const [shifts, setShifts] = useState<ShiftPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [hours, setHours] = useState("");
  const [role, setRole] = useState("");

  const inputCls = "w-full rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent";

  useEffect(() => {
    shiftPlansApi
      .list(area)
      .then(setShifts)
      .catch((e) => setError(e instanceof Error ? e.message : "Errore caricamento turni"))
      .finally(() => setLoading(false));
  }, [area]);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await shiftPlansApi.create({
        area, day, staffName: name.trim(), hours: hours.trim(), role: role.trim(),
      });
      setShifts((prev) => [...prev, created].sort((a, b) => a.day.localeCompare(b.day)));
      setName(""); setHours(""); setRole("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await shiftPlansApi.delete(id);
      setShifts((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore eliminazione");
    }
  }

  const grouped = shifts.reduce<Record<string, ShiftPlan[]>>((acc, s) => {
    const k = s.day || "Senza data";
    if (!acc[k]) acc[k] = [];
    acc[k].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card title="Aggiungi turno" description="Pianificazione persistita su DB">
        <div className="space-y-4">
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputCls} />
          <div className="grid gap-4 sm:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome operatore" className={inputCls} />
            <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Ore (es. 8-16)" className={inputCls} />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ruolo" className={inputCls} />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={() => void add()}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Salvataggio…" : "Aggiungi turno"}
          </button>
        </div>
      </Card>

      {loading && <p className="text-sm text-rw-muted text-center">Caricamento turni…</p>}
      {!loading && shifts.length === 0 && (
        <p className="text-sm text-rw-muted text-center py-4">Nessun turno pianificato.</p>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, dayShifts]) => (
          <Card
            key={d}
            title={d ? new Date(d + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : "Senza data"}
            description={`${dayShifts.length} operatori`}
          >
            <div className="space-y-1">
              {dayShifts.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2">
                  <div>
                    <span className="font-semibold text-sm text-rw-ink">{s.staffName}</span>
                    {s.hours && <span className="ml-2 text-xs text-rw-muted">{s.hours}</span>}
                    {s.role && (
                      <span className="ml-2 rounded bg-rw-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-rw-accent">
                        {s.role}
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={() => void remove(s.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        ))}
    </div>
  );
}
