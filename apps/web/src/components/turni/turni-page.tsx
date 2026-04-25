"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import {
  shiftPlansApi,
  staffApi,
  type ShiftPlan,
  type ShiftPlanCreate,
  type ShiftPlanType,
  type StaffMember,
} from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";

/* ─── Constants ─────────────────────────────────── */

const AREAS = ["Tutte", "sala", "cucina", "bar", "pizzeria"] as const;
type Area = (typeof AREAS)[number];

const SHIFT_TYPES: { value: ShiftPlanType; label: string; color: string }[] = [
  { value: "lavoro", label: "Lavoro", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "ferie", label: "Ferie", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "malattia", label: "Malattia", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "permesso", label: "Permesso", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "riposo", label: "Riposo", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
];

const DAYS_IT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const SYNC_ROLES = new Set(["supervisor", "owner", "super_admin"]);

/* ─── Helpers ────────────────────────────────────── */

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoToDate(iso: string) {
  return new Date(iso + "T12:00:00");
}

function formatDayLabel(iso: string) {
  const d = isoToDate(iso);
  return `${DAYS_IT[d.getDay()]} ${d.getDate()}`;
}

function computeHours(plan: ShiftPlan): number {
  if (plan.shiftType !== "lavoro") return 0;
  if (plan.startTime && plan.endTime) {
    const [sh, sm] = plan.startTime.split(":").map(Number);
    const [eh, em] = plan.endTime.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    return mins > 0 ? mins / 60 : 0;
  }
  if (plan.hours) {
    const m = plan.hours.match(/(\d+)-(\d+)/);
    if (m) return Number(m[2]) - Number(m[1]);
    const n = Number(plan.hours);
    if (!isNaN(n)) return n;
  }
  return 0;
}

function shiftTypeStyle(type: ShiftPlanType) {
  return SHIFT_TYPES.find((s) => s.value === type)?.color ?? SHIFT_TYPES[0].color;
}

function shiftTypeLabel(type: ShiftPlanType) {
  return SHIFT_TYPES.find((s) => s.value === type)?.label ?? type;
}

/* ─── Input styles ───────────────────────────────── */

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98] disabled:opacity-50";
const btnGhost =
  "inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-medium text-rw-muted transition hover:bg-rw-surfaceAlt hover:text-rw-ink active:scale-[0.98]";

/* ─── Modal ──────────────────────────────────────── */

type ModalProps = {
  open: boolean;
  onClose: () => void;
  staff: StaffMember[];
  initial?: Partial<ShiftPlan & { day: string; area: string }>;
  onSave: (data: ShiftPlanCreate) => Promise<void>;
  editId?: string;
};

function ShiftModal({ open, onClose, staff, initial, onSave, editId }: ModalProps) {
  const [day, setDay] = useState(initial?.day ?? toIso(new Date()));
  const [area, setArea] = useState<string>(initial?.area ?? "cucina");
  const [staffId, setStaffId] = useState<string>(initial?.staffId ?? "");
  const [staffName, setStaffName] = useState(initial?.staffName ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "16:00");
  const [shiftType, setShiftType] = useState<ShiftPlanType>(initial?.shiftType ?? "lavoro");
  const [role, setRole] = useState(initial?.role ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDay(initial?.day ?? toIso(new Date()));
      setArea(initial?.area ?? "cucina");
      setStaffId(initial?.staffId ?? "");
      setStaffName(initial?.staffName ?? "");
      setStartTime(initial?.startTime ?? "08:00");
      setEndTime(initial?.endTime ?? "16:00");
      setShiftType(initial?.shiftType ?? "lavoro");
      setRole(initial?.role ?? "");
      setNotes(initial?.notes ?? "");
      setErr(null);
    }
  }, [open, initial]);

  function onStaffChange(id: string) {
    setStaffId(id);
    const member = staff.find((s) => s.id === id);
    if (member) {
      setStaffName(member.name);
      setRole(member.role);
    }
  }

  async function handleSave() {
    if (!staffName.trim()) { setErr("Seleziona o inserisci un operatore"); return; }
    setSaving(true); setErr(null);
    try {
      await onSave({
        day, area,
        staffId: staffId || null,
        staffName: staffName.trim(),
        startTime,
        endTime,
        shiftType,
        role: role.trim(),
        notes: notes.trim(),
        leaveApproval: ["ferie", "malattia", "permesso"].includes(shiftType) ? "pending" : "approved",
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-rw-line bg-rw-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-rw-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-rw-ink">
            {editId ? "Modifica turno" : "Nuovo turno"}
          </h2>
          <button type="button" onClick={onClose} className="text-rw-muted hover:text-rw-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Area</label>
              <select value={area} onChange={(e) => setArea(e.target.value)} className={inputCls}>
                {(["cucina", "sala", "bar", "pizzeria"] as const).map((a) => (
                  <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Operatore</label>
            {staff.length > 0 ? (
              <select value={staffId} onChange={(e) => onStaffChange(e.target.value)} className={inputCls}>
                <option value="">— scegli dallo staff —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            ) : null}
            {!staffId && (
              <input
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Nome operatore (libero)"
                className={cn(inputCls, staff.length > 0 && "mt-2")}
              />
            )}
            {staffId && (
              <button
                type="button"
                onClick={() => { setStaffId(""); setStaffName(""); }}
                className="mt-1 text-xs text-rw-accent hover:underline"
              >
                Inserisci manualmente
              </button>
            )}
          </div>

          <div>
            <label className={labelCls}>Tipo turno</label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setShiftType(t.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                    shiftType === t.value ? t.color : "border-rw-line text-rw-muted hover:border-rw-accent/40",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {shiftType === "lavoro" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Inizio turno</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fine turno</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Note</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note opzionali…" className={inputCls} />
          </div>

          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-rw-line px-6 py-4">
          <button type="button" onClick={onClose} className={btnGhost}>Annulla</button>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Salvataggio…" : "Salva turno"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Weekly View ─────────────────────────────────── */

type WeekViewProps = {
  weekStart: Date;
  plans: ShiftPlan[];
  staff: StaffMember[];
  filterArea: Area;
  canEdit: boolean;
  onAdd: (day: string, area?: string) => void;
  onEdit: (plan: ShiftPlan) => void;
  onDelete: (id: string) => void;
};

function WeekView({ weekStart, plans, staff, filterArea, canEdit, onAdd, onEdit, onDelete }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => toIso(addDays(weekStart, i)));

  const filtered = plans.filter((p) =>
    days.includes(p.day) && (filterArea === "Tutte" || p.area === filterArea),
  );

  const grouped = filtered.reduce<Record<string, ShiftPlan[]>>((acc, p) => {
    const k = p.day;
    if (!acc[k]) acc[k] = [];
    acc[k].push(p);
    return acc;
  }, {});

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7 gap-2">
        {days.map((day) => {
          const dayPlans = grouped[day] ?? [];
          const isToday = day === toIso(new Date());
          return (
            <div key={day} className="flex flex-col gap-1.5">
              <div className={cn(
                "rounded-xl py-2 text-center text-xs font-bold",
                isToday ? "bg-rw-accent text-white" : "bg-rw-surfaceAlt text-rw-muted",
              )}>
                {formatDayLabel(day)}
              </div>
              <div className="flex min-h-[180px] flex-col gap-1 rounded-xl border border-rw-line bg-rw-bg p-1.5">
                {dayPlans.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "group relative rounded-lg border px-2 py-1.5 text-[11px]",
                      shiftTypeStyle(p.shiftType),
                    )}
                  >
                    <div className="font-bold leading-tight truncate">{p.staffName}</div>
                    {p.shiftType === "lavoro" && p.startTime && p.endTime ? (
                      <div className="opacity-80">{p.startTime}–{p.endTime}</div>
                    ) : (
                      <div className="opacity-70">{shiftTypeLabel(p.shiftType)}</div>
                    )}
                    {filterArea === "Tutte" && (
                      <div className="mt-0.5 opacity-60 uppercase tracking-wide text-[9px]">{p.area}</div>
                    )}
                    {canEdit && (
                      <div className="absolute right-1 top-1 hidden group-hover:flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="rounded p-0.5 hover:bg-white/20"
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p.id)}
                          className="rounded p-0.5 hover:bg-red-400/30"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onAdd(day, filterArea !== "Tutte" ? filterArea : undefined)}
                    className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-dashed border-rw-line py-1 text-[10px] text-rw-muted transition hover:border-rw-accent/50 hover:text-rw-accent"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Monthly View ───────────────────────────────── */

type MonthViewProps = {
  year: number;
  month: number;
  plans: ShiftPlan[];
  filterArea: Area;
  canEdit: boolean;
  onAdd: (day: string) => void;
  onEdit: (plan: ShiftPlan) => void;
  onDelete: (id: string) => void;
};

function MonthView({ year, month, plans, filterArea, canEdit, onAdd, onEdit, onDelete }: MonthViewProps) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const totalCells = startOffset + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);

  const filtered = plans.filter((p) => {
    const d = isoToDate(p.day);
    return d.getFullYear() === year && d.getMonth() === month &&
      (filterArea === "Tutte" || p.area === filterArea);
  });

  const byDay = filtered.reduce<Record<number, ShiftPlan[]>>((acc, p) => {
    const d = isoToDate(p.day).getDate();
    if (!acc[d]) acc[d] = [];
    acc[d].push(p);
    return acc;
  }, {});

  const today = new Date();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div key={d} className="py-1.5 text-center text-xs font-bold text-rw-muted">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: rows * 7 }, (_, i) => {
          const dayNum = i - startOffset + 1;
          if (dayNum < 1 || dayNum > lastDay.getDate()) {
            return <div key={i} className="min-h-[80px] rounded-xl bg-rw-surfaceAlt/30" />;
          }
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const dayPlans = byDay[dayNum] ?? [];
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum;
          return (
            <div
              key={i}
              className={cn(
                "group flex min-h-[80px] flex-col gap-1 rounded-xl border p-1.5",
                isToday ? "border-rw-accent/50 bg-rw-accent/5" : "border-rw-line bg-rw-bg",
              )}
            >
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold self-end",
                isToday ? "bg-rw-accent text-white" : "text-rw-muted",
              )}>
                {dayNum}
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                {dayPlans.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between rounded px-1.5 py-0.5 text-[10px] border",
                      shiftTypeStyle(p.shiftType),
                    )}
                  >
                    <span className="truncate font-semibold">{p.staffName}</span>
                    {canEdit && (
                      <span className="hidden group-hover:flex gap-0.5 ml-1 shrink-0">
                        <button onClick={() => onEdit(p)} className="hover:opacity-80"><Edit2 className="h-2 w-2" /></button>
                        <button onClick={() => onDelete(p.id)} className="hover:opacity-80"><Trash2 className="h-2 w-2" /></button>
                      </span>
                    )}
                  </div>
                ))}
                {dayPlans.length > 3 && (
                  <div className="text-[10px] text-rw-muted pl-1">+{dayPlans.length - 3} altri</div>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onAdd(iso)}
                  className="flex justify-center rounded border border-dashed border-rw-line/60 py-0.5 text-[10px] text-rw-muted/60 opacity-0 transition group-hover:opacity-100 hover:border-rw-accent/40 hover:text-rw-accent"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Summary Tab ────────────────────────────────── */

type SummaryProps = {
  plans: ShiftPlan[];
  staff: StaffMember[];
  filterArea: Area;
  from: string;
  to: string;
};

function SummaryView({ plans, staff, filterArea, from, to }: SummaryProps) {
  const filtered = plans.filter((p) =>
    p.day >= from && p.day <= to && (filterArea === "Tutte" || p.area === filterArea),
  );

  type StaffStat = {
    name: string;
    role: string;
    hoursLavoro: number;
    daysFerie: number;
    daysMalattia: number;
    daysPermesso: number;
    daysRiposo: number;
    daysLavoro: number;
  };

  const statsMap = new Map<string, StaffStat>();

  for (const p of filtered) {
    const key = p.staffId ?? p.staffName;
    if (!statsMap.has(key)) {
      const member = staff.find((s) => s.id === p.staffId || s.name === p.staffName);
      statsMap.set(key, {
        name: p.staffName,
        role: member?.role ?? p.role ?? "",
        hoursLavoro: 0,
        daysFerie: 0,
        daysMalattia: 0,
        daysPermesso: 0,
        daysRiposo: 0,
        daysLavoro: 0,
      });
    }
    const stat = statsMap.get(key)!;
    if (p.shiftType === "lavoro") {
      stat.hoursLavoro += computeHours(p);
      stat.daysLavoro += 1;
    } else if (p.shiftType === "ferie") stat.daysFerie += 1;
    else if (p.shiftType === "malattia") stat.daysMalattia += 1;
    else if (p.shiftType === "permesso") stat.daysPermesso += 1;
    else if (p.shiftType === "riposo") stat.daysRiposo += 1;
  }

  const stats = Array.from(statsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  if (stats.length === 0) {
    return <p className="py-10 text-center text-sm text-rw-muted">Nessun turno nel periodo selezionato.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-rw-line text-xs font-semibold text-rw-muted">
            <th className="py-3 text-left pl-2">Operatore</th>
            <th className="py-3 text-left">Ruolo</th>
            <th className="py-3 text-right">Ore lavorate</th>
            <th className="py-3 text-right">Giorni lavoro</th>
            <th className="py-3 text-right">Ferie</th>
            <th className="py-3 text-right">Malattia</th>
            <th className="py-3 text-right">Permesso</th>
            <th className="py-3 text-right">Riposo</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} className="border-b border-rw-line/40 hover:bg-rw-surfaceAlt/40 transition">
              <td className="py-2.5 pl-2 font-semibold text-rw-ink">{s.name}</td>
              <td className="py-2.5 capitalize text-rw-muted">{s.role}</td>
              <td className="py-2.5 text-right text-rw-ink font-mono">
                {s.hoursLavoro > 0 ? `${s.hoursLavoro.toFixed(1)}h` : "—"}
              </td>
              <td className="py-2.5 text-right text-emerald-400">{s.daysLavoro > 0 ? s.daysLavoro : "—"}</td>
              <td className="py-2.5 text-right text-blue-400">{s.daysFerie > 0 ? s.daysFerie : "—"}</td>
              <td className="py-2.5 text-right text-red-400">{s.daysMalattia > 0 ? s.daysMalattia : "—"}</td>
              <td className="py-2.5 text-right text-amber-400">{s.daysPermesso > 0 ? s.daysPermesso : "—"}</td>
              <td className="py-2.5 text-right text-slate-400 pr-2">{s.daysRiposo > 0 ? s.daysRiposo : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────── */

const tabs = [
  { id: "settimana", label: "Settimana" },
  { id: "mese", label: "Mese" },
  { id: "riepilogo", label: "Riepilogo" },
];

export function TurniPage() {
  const { user } = useAuth();
  const canEdit = !user?.role || !["staff"].includes(user.role);
  const canSync = user?.role ? SYNC_ROLES.has(user.role) : false;

  const [tab, setTab] = useState("settimana");
  const [plans, setPlans] = useState<ShiftPlan[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const [filterArea, setFilterArea] = useState<Area>("Tutte");

  const now = new Date();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(now));
  const [monthYear, setMonthYear] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<Partial<ShiftPlan & { day: string; area: string }> | undefined>();
  const [editId, setEditId] = useState<string | undefined>();

  const weekFrom = toIso(weekStart);
  const weekTo = toIso(addDays(weekStart, 6));
  const monthFrom = `${monthYear.year}-${String(monthYear.month + 1).padStart(2, "0")}-01`;
  const monthTo = toIso(new Date(monthYear.year, monthYear.month + 1, 0));

  const activeFrom = tab === "settimana" ? weekFrom : monthFrom;
  const activeTo = tab === "settimana" ? weekTo : tab === "mese" ? monthTo : monthTo;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planRows, staffRows] = await Promise.all([
        shiftPlansApi.list({ from: monthFrom, to: monthTo }),
        staffApi.list(),
      ]);
      setPlans(planRows);
      setStaff(staffRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento dati");
    } finally {
      setLoading(false);
    }
  }, [monthFrom, monthTo]);

  useEffect(() => { void load(); }, [load]);

  const visiblePlans = useMemo(() => {
    return plans.filter((p) => filterArea === "Tutte" || p.area === filterArea);
  }, [plans, filterArea]);

  function openAdd(day?: string, area?: string) {
    setEditId(undefined);
    setModalInitial({ day: day ?? toIso(new Date()), area: area ?? (filterArea !== "Tutte" ? filterArea : "cucina") });
    setModalOpen(true);
  }

  function openEdit(plan: ShiftPlan) {
    setEditId(plan.id);
    setModalInitial(plan);
    setModalOpen(true);
  }

  async function handleSave(data: ShiftPlanCreate) {
    if (editId) {
      const updated = await shiftPlansApi.update(editId, data);
      setPlans((prev) => prev.map((p) => (p.id === editId ? updated : p)));
    } else {
      const created = await shiftPlansApi.create(data);
      setPlans((prev) => [...prev, created].sort((a, b) => a.day.localeCompare(b.day)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo turno?")) return;
    await shiftPlansApi.delete(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSync() {
    if (!confirm(`Sincronizzare lo stato dello staff in base ai turni pianificati oggi?`)) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await shiftPlansApi.sync(activeFrom, activeTo);
      setSyncMsg(`Sincronizzati ${result.updated.length} dipendenti su ${result.summary.totalShifts} turni.`);
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Errore sincronizzazione");
    } finally {
      setSyncing(false);
    }
  }

  function prevWeek() { setWeekStart((d) => addDays(d, -7)); }
  function nextWeek() { setWeekStart((d) => addDays(d, 7)); }
  function prevMonth() {
    setMonthYear(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  }
  function nextMonth() {
    setMonthYear(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turni"
        subtitle="Pianificazione settimanale e mensile per area."
      >
        <button
          type="button"
          onClick={() => {
            const rows = [
              ["Data", "Area", "Dipendente", "Ruolo", "Tipo", "Inizio", "Fine", "Note"],
              ...plans.map((p) => [p.day, p.area, p.staffName, p.role, p.shiftType, p.startTime, p.endTime, p.notes]),
            ];
            const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
            a.download = `turni_${monthFrom}_${monthTo}.csv`; a.click();
          }}
          className={btnGhost}
        >
          <Download className="h-4 w-4" /> Esporta CSV
        </button>
        {canSync && (
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing}
            className={btnGhost}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizza staff
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => openAdd()}
            className={btnPrimary}
          >
            <Plus className="h-4 w-4" />
            Nuovo turno
          </button>
        )}
      </PageHeader>

      {syncMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-3 text-sm text-rw-accent">
          <CalendarClock className="h-4 w-4 shrink-0" />
          {syncMsg}
          <button type="button" onClick={() => setSyncMsg(null)} className="ml-auto text-rw-muted hover:text-rw-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        <div className="flex flex-wrap gap-1 ml-auto">
          {AREAS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setFilterArea(a)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition",
                filterArea === a
                  ? "bg-rw-accent/15 text-rw-accent"
                  : "border border-rw-line text-rw-muted hover:text-rw-ink",
              )}
            >
              {a === "Tutte" ? "Tutte le aree" : a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-rw-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-3" />
          Caricamento turni…
        </div>
      ) : (
        <>
          {tab === "settimana" && (
            <Card
              title={`Settimana ${new Date(weekFrom + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long" })} – ${new Date(weekTo + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`}
              description={`${visiblePlans.filter((p) => p.day >= weekFrom && p.day <= weekTo).length} turni pianificati`}
            >
              <div className="flex items-center gap-2 mb-4">
                <button type="button" onClick={prevWeek} className={btnGhost}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStart(getWeekStart(new Date()))}
                  className="text-xs text-rw-accent hover:underline"
                >
                  Oggi
                </button>
                <button type="button" onClick={nextWeek} className={btnGhost}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <WeekView
                weekStart={weekStart}
                plans={plans}
                staff={staff}
                filterArea={filterArea}
                canEdit={canEdit}
                onAdd={(day, area) => openAdd(day, area)}
                onEdit={openEdit}
                onDelete={(id) => void handleDelete(id)}
              />
            </Card>
          )}

          {tab === "mese" && (
            <Card
              title={`${MONTHS_IT[monthYear.month]} ${monthYear.year}`}
              description={`${visiblePlans.filter((p) => p.day >= monthFrom && p.day <= monthTo).length} turni pianificati`}
            >
              <div className="flex items-center gap-2 mb-4">
                <button type="button" onClick={prevMonth} className={btnGhost}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMonthYear({ year: now.getFullYear(), month: now.getMonth() })}
                  className="text-xs text-rw-accent hover:underline"
                >
                  Mese corrente
                </button>
                <button type="button" onClick={nextMonth} className={btnGhost}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <MonthView
                year={monthYear.year}
                month={monthYear.month}
                plans={plans}
                filterArea={filterArea}
                canEdit={canEdit}
                onAdd={(day) => openAdd(day)}
                onEdit={openEdit}
                onDelete={(id) => void handleDelete(id)}
              />
            </Card>
          )}

          {tab === "riepilogo" && (
            <Card title="Riepilogo ore e presenze" description={`${monthFrom} → ${monthTo}`}>
              <SummaryView
                plans={plans}
                staff={staff}
                filterArea={filterArea}
                from={monthFrom}
                to={monthTo}
              />
            </Card>
          )}
        </>
      )}

      <ShiftModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        staff={staff}
        initial={modalInitial}
        editId={editId}
        onSave={handleSave}
      />
    </div>
  );
}
