"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock, Droplets, Edit2, Flame, Loader2, Minus, Plus, Printer, Save, Shield, ThermometerSun, Trash2, Upload, Users, UtensilsCrossed, X } from "lucide-react";
import { useOrders } from "@/components/orders/orders-context";
import { useMenu, calcFoodCost } from "@/components/menu/menu-context";
import type { RecipeIngredient, RecipeStep, Recipe } from "@/components/menu/menu-context";
import type { CourseStatus, Order, OrderItem } from "@/components/orders/types";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { KdsColumn } from "@/components/shared/kds-column";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import { VoiceButton } from "@/components/ai/ai-voice";
import { aiOpsApi, haccpApi, roomServiceApi, shiftPlansApi, type KitchenOperationalSnapshot, type HaccpEntry as ApiHaccpEntry, type HaccpCreatePayload, type RoomServiceOrder, type ShiftPlan } from "@/lib/api-client";
import { StockAlertBanner } from "@/components/shared/stock-alert-banner";
import { LoadErrorBanner } from "@/components/shared/load-error-banner";
import { useI18n } from "@/core/i18n/provider";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getSortedCourses(items: OrderItem[]): number[] {
  const set = new Set(items.map((i) => i.course));
  return [...set].sort((a, b) => a - b);
}

type KdsState = { courseNum: number; status: CourseStatus; isLast: boolean };

function getKitchenDisplayState(order: Order): KdsState | null {
  const nums = getSortedCourses(order.items);
  if (nums.length === 0) return null;
  const current = nums.find((n) => order.courseStates[String(n)] !== "servito");
  if (current == null) return null;
  return {
    courseNum: current,
    status: order.courseStates[String(current)] as CourseStatus,
    isLast: current === nums[nums.length - 1],
  };
}

function minutesSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

const TABS = [
  { id: "comande", label: "Comande" },
  { id: "room-service", label: "Room Service" },
  { id: "ricette", label: "Ricette" },
  { id: "piatti-giorno", label: "Piatti del Giorno" },
  { id: "haccp", label: "HACCP" },
  { id: "turni", label: "Turni cucina" },
] as const;

const inputCls = "w-full rounded-lg border border-rw-line bg-rw-bg px-3 py-2 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const COURSE_STATUS_COLORS: Record<CourseStatus, string> = {
  queued: "bg-rw-muted/50",
  in_attesa: "bg-amber-400",
  in_preparazione: "bg-sky-400",
  pronto: "bg-emerald-400",
  servito: "bg-rw-muted/30 opacity-60",
};

function CourseIndicators({ order }: { order: Order }) {
  const { t } = useI18n();
  const nums = getSortedCourses(order.items);
  return (
    <span className="flex items-center gap-1">
      {nums.map((n) => {
        const st = order.courseStates[String(n)] as CourseStatus | undefined;
        const safe: CourseStatus = st ?? "queued";
        const statusLabel = t(`cucina.kds.status.${safe}`);
        const portataLabel = t("cucina.kds.portata").replace("{n}", String(n));
        return (
          <span
            key={n}
            className={`h-2 w-2 rounded-full ${COURSE_STATUS_COLORS[safe]}`}
            title={`${portataLabel}: ${statusLabel}`}
            aria-label={`${portataLabel}: ${statusLabel}`}
          />
        );
      })}
    </span>
  );
}

function OrderCard({
  order,
  kds,
  onInPrep,
  onPronto,
  onServito,
}: {
  order: Order;
  kds: KdsState;
  onInPrep: () => void;
  onPronto: () => void;
  onServito: () => void;
}) {
  const { t } = useI18n();
  const elapsed = minutesSince(order.createdAt);
  /** Corsi che hanno almeno una riga in cucina: tutti visibili subito; i pulsanti restano solo sul corso attivo (`kds`). */
  const cucinaCourseNums = [...new Set(order.items.filter((i) => i.area === "cucina").map((i) => i.course))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-rw-accent/15 px-2 py-0.5 text-xs font-bold text-rw-accent">
            T{order.table ?? "?"}
          </span>
          <span className="text-xs text-rw-muted">{order.waiter}</span>
        </div>
        <div className="flex items-center gap-2">
          <CourseIndicators order={order} />
          <span className={`text-xs font-semibold ${elapsed > 15 ? "text-red-400" : "text-rw-muted"}`}>
            {elapsed}′
          </span>
        </div>
      </div>

      {order.notes ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 italic">
          {order.notes}
        </p>
      ) : null}

      {cucinaCourseNums.length === 0 ? (
        <p className="text-xs text-rw-muted italic">{t("cucina.kds.no_dishes")}</p>
      ) : (
        <div className="space-y-3">
          {cucinaCourseNums.map((courseNum) => {
            const rawSt = order.courseStates[String(courseNum)] as CourseStatus | undefined;
            const st: CourseStatus = rawSt ?? "queued";
            const isActive = courseNum === kds.courseNum;
            const courseItems = order.items.filter((i) => i.course === courseNum && i.area === "cucina");
            const statusLabel =
              !isActive && st === "queued"
                ? t("cucina.kds.status.queued")
                : !isActive && st === "in_attesa"
                  ? t("cucina.kds.status.in_attesa")
                  : t(`cucina.kds.status.${st}`);
            return (
              <div
                key={courseNum}
                className={cn(
                  "rounded-lg border px-2 py-2 space-y-1",
                  isActive ? "border-rw-accent/45 bg-rw-bg/35" : "border-rw-line/35 bg-rw-surface/25",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-rw-muted">
                    {t("cucina.kds.portata").replace("{n}", String(courseNum))}
                    {isActive ? (
                      <span className="ml-2 rounded bg-rw-accent/20 px-1.5 py-0.5 normal-case text-[10px] font-bold text-rw-accent">
                        {t("cucina.kds.active")}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${COURSE_STATUS_COLORS[st] ?? COURSE_STATUS_COLORS.queued}`} aria-hidden />
                    <span className={cn("text-xs font-semibold", !isActive && (st === "queued" || st === "in_attesa") ? "text-rw-soft" : "text-rw-ink")}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <ul className="space-y-0.5">
                  {courseItems.map((it) => (
                    <li key={it.id} className="flex items-center justify-between text-sm text-rw-soft">
                      <span>
                        <span className="font-medium text-rw-ink">{it.qty}×</span> {it.name}
                      </span>
                      {it.note && <span className="text-xs text-rw-muted italic">{it.note}</span>}
                    </li>
                  ))}
                </ul>

                {isActive ? (
                  <div className="flex items-center gap-2 pt-1">
                    {kds.status === "in_attesa" && (
                      <button type="button" onClick={onInPrep} className="flex-1 rounded-lg bg-rw-accent/15 px-3 py-1.5 text-xs font-bold text-rw-accent transition hover:bg-rw-accent/25">
                        {t("cucina.kds.btn_in_prep")}
                      </button>
                    )}
                    {kds.status === "in_preparazione" && (
                      <button type="button" onClick={onPronto} className="flex-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/25">
                        {t("cucina.kds.btn_pronto")}
                      </button>
                    )}
                    {kds.status === "pronto" && (
                      <button type="button" onClick={onServito} className="flex-1 rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-400 transition hover:bg-blue-500/25">
                        {t("cucina.kds.btn_servito")}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

function RicetteTab() {
  const { t } = useI18n();
  const { recipes, addRecipe, updateRecipe, removeRecipe, addToMenu, addToDailyMenu } = useMenu();

  const emptyIng = (): RecipeIngredient => ({ id: `ing-${Date.now()}-${Math.random()}`, name: "", qty: 0, unit: "g", unitCost: 0, wastePct: 0 });
  const emptyStep = (order: number): RecipeStep => ({ id: `st-${Date.now()}-${Math.random()}`, order, text: "" });

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Primi");
  const [area, setArea] = useState<"cucina" | "pizzeria" | "bar">("cucina");
  const [portions, setPortions] = useState(1);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [targetFcPct, setTargetFcPct] = useState(30);
  const [ivaPct, setIvaPct] = useState(10);
  const [overheadPct, setOverheadPct] = useState(5);
  const [packagingCost, setPackagingCost] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [energyCost, setEnergyCost] = useState(0);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([emptyIng()]);
  const [steps, setSteps] = useState<RecipeStep[]>([emptyStep(1)]);
  const [notes, setNotes] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  // ── stato modifica ricetta ─────────────────────────────────────────
  type RecipeQuickEdit = {
    id: string; name: string; category: string; area: "cucina" | "pizzeria" | "bar";
    portions: number; sellingPrice: number; targetFcPct: number; notes: string;
  };
  const [editRecipe, setEditRecipe] = useState<RecipeQuickEdit | null>(null);
  const [editIngredients, setEditIngredients] = useState<RecipeIngredient[]>([]);
  const [editSteps, setEditSteps] = useState<RecipeStep[]>([]);
  const [editRecipeSaving, setEditRecipeSaving] = useState(false);
  const [editRecipeError, setEditRecipeError] = useState<string | null>(null);

  const emptyEditIng = (): RecipeIngredient => ({
    id: `ei-${Date.now()}-${Math.random()}`, name: "", qty: 0, unit: "kg", unitCost: 0, wastePct: 0,
  });
  const emptyEditStep = (): RecipeStep => ({
    id: `es-${Date.now()}-${Math.random()}`, order: editSteps.length + 1, text: "",
  });

  function updateEditIng(idx: number, field: keyof RecipeIngredient, value: string | number) {
    setEditIngredients((p) => p.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  }
  function removeEditIng(idx: number) {
    setEditIngredients((p) => p.filter((_, i) => i !== idx));
  }
  function updateEditStep(idx: number, text: string) {
    setEditSteps((p) => p.map((s, i) => (i === idx ? { ...s, text } : s)));
  }
  function removeEditStep(idx: number) {
    setEditSteps((p) => p.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  }

  const draftRecipe = {
    name, category, area, portions, sellingPrice, targetFcPct, ivaPct, overheadPct,
    packagingCost, laborCost, energyCost,
    ingredients: ingredients.filter((i) => i.name.trim()),
    steps: steps.filter((s) => s.text.trim()),
    notes,
  };
  const fc = calcFoodCost({ ...draftRecipe, id: "", createdAt: "" });

  function updateIng(idx: number, field: keyof RecipeIngredient, value: string | number) {
    setIngredients((p) => p.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  }

  function removeIng(idx: number) {
    setIngredients((p) => p.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, text: string) {
    setSteps((p) => p.map((s, i) => (i === idx ? { ...s, text } : s)));
  }

  function removeStep(idx: number) {
    setSteps((p) => p.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  }

  function resetForm() {
    setName(""); setCategory("Primi"); setArea("cucina"); setPortions(1);
    setSellingPrice(0); setTargetFcPct(30); setIvaPct(10); setOverheadPct(5);
    setPackagingCost(0); setLaborCost(0); setEnergyCost(0);
    setIngredients([emptyIng()]); setSteps([emptyStep(1)]); setNotes("");
  }

  async function save() {
    if (!name.trim()) return;
    try {
      await addRecipe(draftRecipe);
      resetForm();
      showFlash(t("cucina.recipe.saved"));
    } catch (e) {
      showFlash(`Errore: ${e instanceof Error ? e.message : t("cucina.recipe.save_failed")}`);
    }
  }

  async function handleAddToMenu(recipe: Recipe) {
    try {
      await addToMenu(recipe);
      showFlash(`"${recipe.name}" ${t("cucina.recipe.added_to_menu")}`);
    } catch (e) {
      showFlash(e instanceof Error ? e.message : t("cucina.recipe.save_failed"));
    }
  }

  async function handleAddToDaily(recipe: Recipe) {
    try {
      await addToDailyMenu(recipe, t("cucina.recipe.from_cookbook"));
      showFlash(`"${recipe.name}" ${t("cucina.recipe.added_to_daily")}`);
    } catch (e) {
      showFlash(e instanceof Error ? e.message : t("cucina.recipe.save_failed"));
    }
  }

  function openEditRecipe(r: Recipe) {
    setEditRecipe({
      id: r.id, name: r.name, category: r.category, area: r.area,
      portions: r.portions, sellingPrice: r.sellingPrice,
      targetFcPct: r.targetFcPct, notes: r.notes,
    });
    setEditIngredients(r.ingredients.length > 0 ? r.ingredients.map((i) => ({ ...i })) : [emptyEditIng()]);
    setEditSteps(r.steps.length > 0 ? r.steps.map((s) => ({ ...s })) : []);
    setEditRecipeError(null);
  }

  async function handleSaveEditRecipe() {
    if (!editRecipe) return;
    setEditRecipeSaving(true);
    setEditRecipeError(null);
    try {
      const cleanIngs = editIngredients.filter((i) => i.name.trim());
      const cleanSteps = editSteps.filter((s) => s.text.trim()).map((s, idx) => ({ ...s, order: idx + 1 }));
      await updateRecipe(editRecipe.id, {
        name: editRecipe.name,
        category: editRecipe.category,
        area: editRecipe.area,
        portions: editRecipe.portions,
        sellingPrice: editRecipe.sellingPrice,
        targetFcPct: editRecipe.targetFcPct,
        notes: editRecipe.notes,
        ingredients: cleanIngs,
        steps: cleanSteps,
      });
      showFlash(`"${editRecipe.name}" ${t("cucina.recipe.updated")}`);
      setEditRecipe(null);
    } catch (e) {
      setEditRecipeError(e instanceof Error ? e.message : t("cucina.recipe.error_save"));
    } finally {
      setEditRecipeSaving(false);
    }
  }

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  const categories = ["Antipasti", "Primi", "Secondi", "Pizze", "Dolci", "Contorni", "Bevande"];
  const categoryKeys: Record<string, string> = {
    Antipasti: "cucina.category.antipasti",
    Primi: "cucina.category.primi",
    Secondi: "cucina.category.secondi",
    Pizze: "cucina.category.pizze",
    Dolci: "cucina.category.dolci",
    Contorni: "cucina.category.contorni",
    Bevande: "cucina.category.bevande",
  };

  return (
    <div className="space-y-6">
      {flash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300" role="status">
          {flash}
        </div>
      )}

      <Card title={t("cucina.recipe.new_title")} description={t("cucina.recipe.new_desc")}>
        <div className="space-y-5">
          {/* Basic info */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>{t("cucina.recipe.name")}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("cucina.recipe.name_placeholder")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("cucina.recipe.category")}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {categories.map((c) => <option key={c} value={c}>{t(categoryKeys[c] ?? c)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("cucina.recipe.area")}</label>
              <select value={area} onChange={(e) => setArea(e.target.value as typeof area)} className={inputCls}>
                <option value="cucina">{t("cucina.recipe.area.cucina")}</option>
                <option value="pizzeria">{t("cucina.recipe.area.pizzeria")}</option>
                <option value="bar">{t("cucina.recipe.area.bar")}</option>
              </select>
            </div>
          </div>

          {/* Pricing & portions */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className={labelCls}>{t("cucina.recipe.portions")}</label>
              <input type="number" min={1} value={portions} onChange={(e) => setPortions(Number(e.target.value) || 1)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("cucina.recipe.selling_price")}</label>
              <input type="number" step="0.50" min={0} value={sellingPrice || ""} onChange={(e) => setSellingPrice(Number(e.target.value))} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("cucina.recipe.target_fc")}</label>
              <input type="number" min={0} max={100} value={targetFcPct} onChange={(e) => setTargetFcPct(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("cucina.recipe.iva")}</label>
              <input type="number" min={0} value={ivaPct} onChange={(e) => setIvaPct(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("cucina.recipe.overhead")}</label>
              <input type="number" min={0} value={overheadPct} onChange={(e) => setOverheadPct(Number(e.target.value))} className={inputCls} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>{t("cucina.recipe.packaging")}</label>
              <input type="number" step="0.01" min={0} value={packagingCost || ""} onChange={(e) => setPackagingCost(Number(e.target.value))} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("cucina.recipe.labor")}</label>
              <input type="number" step="0.01" min={0} value={laborCost || ""} onChange={(e) => setLaborCost(Number(e.target.value))} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("cucina.recipe.energy")}</label>
              <input type="number" step="0.01" min={0} value={energyCost || ""} onChange={(e) => setEnergyCost(Number(e.target.value))} placeholder="0.00" className={inputCls} />
            </div>
          </div>

          {/* Ingredients table */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted mb-2">{t("cucina.recipe.ingredients")}</p>
            <div className="overflow-x-auto rounded-xl border border-rw-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("cucina.recipe.ingredient")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-20">{t("cucina.recipe.qty")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-16">{t("cucina.recipe.unit")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-24">{t("cucina.recipe.unit_cost")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-20">{t("cucina.recipe.waste_pct")}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted w-20">{t("ui.total")}</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => {
                    const lineTotal = ing.qty * ing.unitCost * (1 + ing.wastePct / 100);
                    return (
                      <tr key={ing.id} className="border-b border-rw-line/50">
                        <td className="px-2 py-1.5">
                          <input value={ing.name} onChange={(e) => updateIng(idx, "name", e.target.value)} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none" placeholder={t("cucina.recipe.ingredient_placeholder")} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.001" min={0} value={ing.qty} onChange={(e) => updateIng(idx, "qty", Number(e.target.value))} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none tabular-nums" placeholder="0" />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={ing.unit} onChange={(e) => updateIng(idx, "unit", e.target.value)} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none">
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="l">l</option>
                            <option value="pz">pz</option>
                            <option value="cucchiaio">cucchiaio</option>
                            <option value="pizzico">pizzico</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.01" min={0} value={ing.unitCost} onChange={(e) => updateIng(idx, "unitCost", Number(e.target.value))} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none tabular-nums" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={0} max={100} value={ing.wastePct} onChange={(e) => updateIng(idx, "wastePct", Number(e.target.value))} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none tabular-nums" placeholder="0" />
                        </td>
                        <td className="px-2 py-1.5 text-right text-sm font-medium text-rw-ink tabular-nums">
                          €{lineTotal.toFixed(2)}
                        </td>
                        <td className="px-1 py-1.5">
                          <button type="button" onClick={() => removeIng(idx)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setIngredients((p) => [...p, emptyIng()])} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rw-accent hover:text-rw-accentSoft">
              <Plus className="h-3.5 w-3.5" /> {t("cucina.recipe.add_ingredient")}
            </button>
          </div>

          {/* Procedure steps */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted mb-2">{t("cucina.recipe.procedure")}</p>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-2">
                  <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rw-accent/15 text-xs font-bold text-rw-accent">
                    {idx + 1}
                  </span>
                  <textarea
                    value={step.text}
                    onChange={(e) => updateStep(idx, e.target.value)}
                    placeholder={t("cucina.recipe.step_placeholder").replace("{n}", String(idx + 1))}
                    rows={2}
                    className={cn(inputCls, "flex-1 resize-y")}
                  />
                  <button type="button" onClick={() => removeStep(idx)} className="mt-2 text-red-400 hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setSteps((p) => [...p, emptyStep(p.length + 1)])} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rw-accent hover:text-rw-accentSoft">
              <Plus className="h-3.5 w-3.5" /> {t("cucina.recipe.add_step")}
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>{t("cucina.recipe.extra_notes")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("cucina.recipe.notes_placeholder")} rows={2} className={cn(inputCls, "resize-y")} />
          </div>

          {/* Live food cost */}
          {ingredients.some((i) => i.name.trim()) && sellingPrice > 0 && (
            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-rw-accent">{t("cucina.recipe.fc_auto")}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                {[
                  { l: t("cucina.recipe.fc_ingredient_cost"), v: `€${fc.ingredientCost.toFixed(2)}` },
                  { l: t("cucina.recipe.fc_portion_cost"), v: `€${fc.portionCost.toFixed(2)}` },
                  { l: t("cucina.recipe.fc_pct"), v: `${fc.fcPct.toFixed(1)}%`, warn: fc.fcPct > targetFcPct },
                  { l: t("cucina.recipe.fc_margin"), v: `€${fc.margin.toFixed(2)}`, warn: fc.margin < 0 },
                  { l: t("cucina.recipe.fc_production_cost"), v: `€${fc.productionCost.toFixed(2)}` },
                  { l: t("cucina.recipe.fc_with_overhead"), v: `€${fc.withOverhead.toFixed(2)}` },
                  { l: t("cucina.recipe.fc_suggested_price"), v: `€${fc.suggestedPrice.toFixed(2)}` },
                  { l: t("cucina.recipe.fc_selling_price"), v: `€${sellingPrice.toFixed(2)}` },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg border border-rw-line/50 bg-rw-surface p-2.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-rw-muted">{s.l}</p>
                    <p className={cn("mt-1 text-base font-bold", s.warn ? "text-red-400" : "text-rw-ink")}>{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save */}
          <button type="button" onClick={() => void save()} disabled={!name.trim()} className="w-full rounded-xl bg-rw-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-rw-accent/85 disabled:cursor-not-allowed disabled:opacity-40">
            {t("cucina.recipe.save_btn")}
          </button>
        </div>
      </Card>

      {/* Saved recipes */}
      {recipes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-rw-ink">{t("cucina.recipe.saved_count").replace("{n}", String(recipes.length))}</h3>
          {recipes.map((r) => {
            const rfc = calcFoodCost(r);
            return (
              <div key={r.id} className="rounded-xl border border-rw-line bg-rw-surface p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-rw-ink">{r.name}</p>
                    <p className="text-xs text-rw-muted">{r.category} · {r.area} · {r.portions} {t("cucina.recipe.portions_abbr")} · €{r.sellingPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn("rounded-full px-2.5 py-1 font-bold", rfc.fcPct > r.targetFcPct ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400")}>
                      FC {rfc.fcPct.toFixed(1)}%
                    </span>
                    <span className="rounded-full bg-rw-surfaceAlt px-2.5 py-1 font-bold text-rw-soft">
                      {t("cucina.recipe.fc_margin")} €{rfc.margin.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Ingredients summary */}
                <div className="flex flex-wrap gap-1">
                  {r.ingredients.map((i) => (
                    <span key={i.id} className="rounded-md bg-rw-surfaceAlt px-2 py-0.5 text-xs text-rw-soft">
                      {i.name} {i.qty}{i.unit}
                    </span>
                  ))}
                </div>

                {/* Steps summary */}
                {r.steps.length > 0 && (
                  <div className="text-xs text-rw-muted">
                    {t("cucina.recipe.steps_count").replace("{n}", String(r.steps.length))}: {r.steps.map((s) => s.text.slice(0, 30)).join(" → ")}…
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => handleAddToMenu(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-rw-accent/30 bg-rw-accent/10 px-3 py-2 text-xs font-bold text-rw-accent hover:bg-rw-accent/20">
                    <Upload className="h-3.5 w-3.5" /> {t("cucina.recipe.load_to_menu")}
                  </button>
                  <button type="button" onClick={() => handleAddToDaily(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20">
                    <CalendarDays className="h-3.5 w-3.5" /> {t("cucina.recipe.add_to_daily")}
                  </button>
                  <button type="button" onClick={() => openEditRecipe(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-400 hover:bg-sky-500/20">
                    <Edit2 className="h-3.5 w-3.5" /> {t("ui.edit")}
                  </button>
                  <button type="button" onClick={() => void removeRecipe(r.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" /> {t("ui.delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: modifica ricetta completa (campi base + ingredienti) */}
      {editRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-rw-line bg-rw-surface p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between sticky top-0 bg-rw-surface pb-2 border-b border-rw-line/40">
              <h2 className="font-display text-lg font-bold text-rw-ink">{t("cucina.recipe.edit_title")}</h2>
              <button type="button" onClick={() => setEditRecipe(null)} className="text-rw-muted hover:text-rw-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Campi base */}
            <div>
              <label className={labelCls}>{t("cucina.recipe.name")}</label>
              <input type="text" className={inputCls} value={editRecipe.name} onChange={(e) => setEditRecipe({ ...editRecipe, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("cucina.recipe.category")}</label>
                <select className={inputCls} value={editRecipe.category} onChange={(e) => setEditRecipe({ ...editRecipe, category: e.target.value })}>
                  {categories.map((c) => <option key={c} value={c}>{t(categoryKeys[c] ?? c)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("cucina.recipe.area")}</label>
                <select className={inputCls} value={editRecipe.area} onChange={(e) => setEditRecipe({ ...editRecipe, area: e.target.value as "cucina" | "pizzeria" | "bar" })}>
                  <option value="cucina">{t("cucina.recipe.area.cucina")}</option>
                  <option value="pizzeria">{t("cucina.recipe.area.pizzeria")}</option>
                  <option value="bar">{t("cucina.recipe.area.bar")}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>{t("cucina.recipe.selling_price")}</label>
                <input type="number" step="0.50" min={0} className={inputCls} value={editRecipe.sellingPrice} onChange={(e) => setEditRecipe({ ...editRecipe, sellingPrice: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>{t("cucina.recipe.portions")}</label>
                <input type="number" min={1} className={inputCls} value={editRecipe.portions} onChange={(e) => setEditRecipe({ ...editRecipe, portions: Number(e.target.value) || 1 })} />
              </div>
              <div>
                <label className={labelCls}>{t("cucina.recipe.target_fc")}</label>
                <input type="number" min={0} max={100} className={inputCls} value={editRecipe.targetFcPct} onChange={(e) => setEditRecipe({ ...editRecipe, targetFcPct: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("ui.notes")}</label>
              <textarea rows={2} className={cn(inputCls, "resize-y")} value={editRecipe.notes} onChange={(e) => setEditRecipe({ ...editRecipe, notes: e.target.value })} />
            </div>

            {/* Ingredienti */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted mb-2">{t("cucina.recipe.ingredients")}</p>
              <div className="overflow-x-auto rounded-xl border border-rw-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("cucina.recipe.ingredient")}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-20">{t("cucina.recipe.qty")}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-16">{t("cucina.recipe.unit")}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-24">{t("cucina.recipe.unit_cost")}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-20">{t("cucina.recipe.waste_pct")}</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {editIngredients.map((ing, idx) => (
                      <tr key={ing.id} className="border-b border-rw-line/50">
                        <td className="px-2 py-1.5">
                          <input value={ing.name} onChange={(e) => updateEditIng(idx, "name", e.target.value)} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none" placeholder={t("cucina.recipe.ingredient_placeholder")} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.001" min={0} value={ing.qty} onChange={(e) => updateEditIng(idx, "qty", Number(e.target.value))} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none tabular-nums" placeholder="0" />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={ing.unit} onChange={(e) => updateEditIng(idx, "unit", e.target.value)} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none">
                            <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option>
                            <option value="l">l</option><option value="pz">pz</option>
                            <option value="cucchiaio">cucchiaio</option><option value="pizzico">pizzico</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.01" min={0} value={ing.unitCost} onChange={(e) => updateEditIng(idx, "unitCost", Number(e.target.value))} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none tabular-nums" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={0} max={100} value={ing.wastePct} onChange={(e) => updateEditIng(idx, "wastePct", Number(e.target.value))} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none tabular-nums" placeholder="0" />
                        </td>
                        <td className="px-1 py-1.5">
                          <button type="button" onClick={() => removeEditIng(idx)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => setEditIngredients((p) => [...p, emptyEditIng()])} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rw-accent hover:text-rw-accentSoft">
                <Plus className="h-3.5 w-3.5" /> {t("cucina.recipe.add_ingredient")}
              </button>
            </div>

            {/* Passaggi */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted mb-2">{t("cucina.recipe.procedure")}</p>
              <div className="space-y-2">
                {editSteps.map((step, idx) => (
                  <div key={step.id} className="flex items-start gap-2">
                    <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rw-accent/15 text-xs font-bold text-rw-accent">
                      {idx + 1}
                    </span>
                    <textarea
                      value={step.text}
                      onChange={(e) => updateEditStep(idx, e.target.value)}
                      placeholder={t("cucina.recipe.step_edit_placeholder").replace("{n}", String(idx + 1))}
                      rows={2}
                      className={cn(inputCls, "flex-1 resize-y")}
                    />
                    <button type="button" onClick={() => removeEditStep(idx)} className="mt-2 text-red-400 hover:text-red-300">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setEditSteps((p) => [...p, { id: `es-${Date.now()}`, order: p.length + 1, text: "" }])} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rw-accent hover:text-rw-accentSoft">
                <Plus className="h-3.5 w-3.5" /> {t("cucina.recipe.add_step")}
              </button>
            </div>

            {editRecipeError && <p className="text-xs text-red-400">{editRecipeError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-rw-accent/90" onClick={() => void handleSaveEditRecipe()} disabled={editRecipeSaving}>
                {editRecipeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editRecipeSaving ? t("cucina.saving") : t("cucina.recipe.save_changes")}
              </button>
              <button type="button" onClick={() => setEditRecipe(null)} className="rounded-xl border border-rw-line px-4 py-2.5 text-sm text-rw-muted hover:text-rw-ink">
                {t("ui.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PiattiGiornoTab() {
  const { t } = useI18n();
  const { dailyDishes, addDailyDish, removeDailyDish, updateDailyDish, addMenuItemFromDaily, recipes, addToDailyMenu } = useMenu();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("Primi");
  const [price, setPrice] = useState(0);
  const [allergens, setAllergens] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  // stato modifica
  type DailyDishEdit = { id: string; name: string; description: string; category: string; price: number; allergens: string; recipeId: string | null };
  const [editDish, setEditDish] = useState<DailyDishEdit | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const categories = ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci"];
  const categoryKeys: Record<string, string> = {
    Antipasti: "cucina.category.antipasti",
    Primi: "cucina.category.primi",
    Secondi: "cucina.category.secondi",
    Contorni: "cucina.category.contorni",
    Dolci: "cucina.category.dolci",
  };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addDailyDish({ name, description: desc, category: cat, price, allergens, recipeId: null });
      setName(""); setDesc(""); setPrice(0); setAllergens("");
      showFlash(t("cucina.daily.added"));
    } catch (err) {
      showFlash(err instanceof Error ? err.message : t("cucina.recipe.save_failed"));
    }
  }

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  async function handleFromRecipe(recipe: Recipe) {
    try {
      await addToDailyMenu(recipe, t("cucina.recipe.from_cookbook"));
      showFlash(`"${recipe.name}" ${t("cucina.recipe.added_to_daily")}`);
    } catch (e) {
      showFlash(e instanceof Error ? e.message : t("cucina.recipe.save_failed"));
    }
  }

  function openEdit(d: DailyDishEdit) {
    setEditDish({ ...d });
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editDish) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateDailyDish(editDish.id, {
        name: editDish.name,
        description: editDish.description,
        category: editDish.category,
        price: editDish.price,
        allergens: editDish.allergens,
      });
      showFlash(`"${editDish.name}" ${t("cucina.daily.updated")}`);
      setEditDish(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : t("cucina.recipe.error_save"));
    } finally {
      setEditSaving(false);
    }
  }

  async function handleAddToMenu(d: DailyDishEdit) {
    try {
      await addMenuItemFromDaily(d);
      showFlash(`"${d.name}" ${t("cucina.daily.added_to_menu")}`);
    } catch (e) {
      showFlash(`Errore: ${e instanceof Error ? e.message : t("cucina.daily.error_add_menu")}`);
    }
  }

  function handlePrint() { window.print(); }

  const grouped = categories
    .map((c) => ({ category: c, items: dailyDishes.filter((d) => d.category === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {flash && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm font-semibold", flash.startsWith("Errore") ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300")} role="status">
          {flash}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add new daily dish */}
        <Card title={t("cucina.daily.new_title")} description={t("cucina.daily.new_desc")}>
          <form className="space-y-3" onSubmit={add}>
            <div>
              <label className={labelCls}>{t("cucina.daily.dish_name")}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("cucina.daily.dish_placeholder")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("cucina.daily.description")}</label>
              <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("cucina.daily.desc_placeholder")} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("cucina.recipe.category")}</label>
                <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
                  {categories.map((c) => <option key={c} value={c}>{t(categoryKeys[c] ?? c)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("cucina.daily.price")}</label>
                <input type="number" step="0.50" min={0} value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} placeholder="0.00" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("cucina.daily.allergens")}</label>
              <input type="text" value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder={t("cucina.daily.allergens_placeholder")} className={inputCls} />
            </div>
            <button type="submit" className="w-full rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85">
              <Plus className="mr-1 inline h-4 w-4" /> {t("cucina.daily.add_btn")}
            </button>
          </form>
        </Card>

        {/* Import from recipes */}
        {recipes.length > 0 && (
          <Card title={t("cucina.daily.import_title")} description={t("cucina.daily.import_desc")}>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recipes.map((r) => {
                const rfc = calcFoodCost(r);
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-rw-ink">{r.name}</p>
                      <p className="text-xs text-rw-muted">{r.category} · €{r.sellingPrice.toFixed(2)} · FC {rfc.fcPct.toFixed(1)}%</p>
                    </div>
                    <button type="button" onClick={() => handleFromRecipe(r)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25">
                      <Upload className="h-3.5 w-3.5" /> {t("ui.add")}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Current daily menu */}
      {dailyDishes.length > 0 && (
        <Card
          title={t("cucina.daily.menu_title").replace("{n}", String(dailyDishes.length))}
          headerRight={
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg border border-rw-line px-3 py-1.5 text-xs font-semibold text-rw-soft hover:text-rw-ink">
              <Printer className="h-3.5 w-3.5" /> {t("ui.print")}
            </button>
          }
        >
          {grouped.map((g) => (
            <div key={g.category} className="mb-3">
              <p className="text-xs font-bold uppercase tracking-wide text-rw-muted mb-1">{g.category}</p>
              <div className="space-y-1">
                {g.items.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2 gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-rw-ink">{d.name}</span>
                      {d.description && <span className="text-xs text-rw-muted ml-2">— {d.description}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold text-rw-accent">€{d.price.toFixed(2)}</span>
                      <button
                        type="button"
                        title={t("cucina.daily.add_to_permanent")}
                        onClick={() => void handleAddToMenu(d)}
                        className="flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-400 hover:bg-sky-500/20"
                      >
                        <ArrowRight className="h-3 w-3" /> Menu
                      </button>
                      <button
                        type="button"
                        title={t("ui.edit")}
                        onClick={() => openEdit(d)}
                        className="rounded-lg border border-rw-line p-1.5 text-rw-muted hover:text-rw-accent"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" title={t("ui.delete")} onClick={() => void removeDailyDish(d.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Modal modifica piatto del giorno */}
      {editDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-rw-line bg-rw-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-rw-ink">{t("cucina.daily.edit_title")}</h2>
              <button type="button" onClick={() => setEditDish(null)} className="text-rw-muted hover:text-rw-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className={labelCls}>{t("ui.name")}</label>
              <input type="text" className={inputCls} value={editDish.name} onChange={(e) => setEditDish({ ...editDish, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>{t("cucina.daily.description")}</label>
              <input type="text" className={inputCls} value={editDish.description} onChange={(e) => setEditDish({ ...editDish, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("cucina.recipe.category")}</label>
                <select className={inputCls} value={editDish.category} onChange={(e) => setEditDish({ ...editDish, category: e.target.value })}>
                  {categories.map((c) => <option key={c} value={c}>{t(categoryKeys[c] ?? c)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("cucina.daily.price")}</label>
                <input type="number" step="0.50" min={0} className={inputCls} value={editDish.price || ""} onChange={(e) => setEditDish({ ...editDish, price: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("cucina.daily.allergens")}</label>
              <input type="text" className={inputCls} value={editDish.allergens} onChange={(e) => setEditDish({ ...editDish, allergens: e.target.value })} />
            </div>
            {editError && <p className="text-xs text-red-400">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-rw-accent/90" onClick={() => void handleSaveEdit()} disabled={editSaving}>
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editSaving ? t("cucina.saving") : t("ui.save")}
              </button>
              <button type="button" onClick={() => setEditDish(null)} className="rounded-xl border border-rw-line px-4 py-2.5 text-sm text-rw-muted hover:text-rw-ink">
                {t("ui.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print-only view */}
      <div className="hidden print:block">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{t("cucina.daily.print_title")}</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        {grouped.map((g) => (
          <div key={g.category} className="mb-4">
            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2">{g.category}</h2>
            {g.items.map((d) => (
              <div key={d.id} className="py-1.5">
                <div className="flex justify-between">
                  <span className="font-medium">{d.name}</span>
                  <span className="font-semibold">€{d.price.toFixed(2)}</span>
                </div>
                {d.description && <p className="text-xs text-gray-500">{d.description}</p>}
                {d.allergens && <p className="text-[10px] text-gray-400 italic">{t("cucina.daily.allergens_label")}: {d.allergens}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HaccpTab() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<ApiHaccpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const HACCP_TYPES: { value: ApiHaccpEntry["type"]; group: string }[] = [
    { value: "temp_frigo", group: "temperature" },
    { value: "temp_freezer", group: "temperature" },
    { value: "temp_cottura", group: "temperature" },
    { value: "temp_abbattitore", group: "temperature" },
    { value: "olio_frittura", group: "temperature" },
    { value: "sanificazione", group: "igiene" },
    { value: "pulizia_manutenzione", group: "igiene" },
    { value: "disinfestazione", group: "igiene" },
    { value: "acqua_potabile", group: "igiene" },
    { value: "rifiuti", group: "igiene" },
    { value: "ricezione_merce", group: "tracciabilita" },
    { value: "allergeni", group: "tracciabilita" },
    { value: "non_conformita", group: "controllo" },
    { value: "formazione_personale", group: "controllo" },
    { value: "altro", group: "controllo" },
  ];

  const HACCP_TYPE_LABELS: Record<string, string> = Object.fromEntries(
    HACCP_TYPES.map((tp) => [tp.value, t(`cucina.haccp.type.${tp.value}`)])
  );

  const GROUP_LABELS: Record<string, string> = {
    temperature: t("cucina.haccp.group.temperature"),
    igiene: t("cucina.haccp.group.igiene"),
    tracciabilita: t("cucina.haccp.group.tracciabilita"),
    controllo: t("cucina.haccp.group.controllo"),
  };

  const TEMP_THRESHOLDS: Record<string, { min: number; max: number }> = {
    temp_frigo: { min: 0, max: 4 },
    temp_freezer: { min: -25, max: -18 },
    temp_cottura: { min: 75, max: 100 },
    temp_abbattitore: { min: -40, max: 3 },
    olio_frittura: { min: 160, max: 180 },
  };

  const [type, setType] = useState<ApiHaccpEntry["type"]>("temp_frigo");
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState("");
  const [temp, setTemp] = useState("");
  const [thresholdMin, setThresholdMin] = useState("");
  const [thresholdMax, setThresholdMax] = useState("");
  const [conforme, setConforme] = useState<boolean | null>(null);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [operator, setOperator] = useState("");
  const [notes, setNotes] = useState("");
  const [supplier, setSupplier] = useState("");
  const [product, setProduct] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cleaningProduct, setCleaningProduct] = useState("");
  const [dilution, setDilution] = useState("");
  const [contactTime, setContactTime] = useState("");

  const isTemp = ["temp_frigo", "temp_freezer", "temp_cottura", "temp_abbattitore", "olio_frittura"].includes(type);
  const isRicezione = type === "ricezione_merce";
  const isSanificazione = type === "sanificazione" || type === "pulizia_manutenzione" || type === "acqua_potabile";
  const isDisinfestazione = type === "disinfestazione";
  const isNonConformita = type === "non_conformita";
  const isFormazione = type === "formazione_personale";
  const isAllergeni = type === "allergeni";
  const isRifiuti = type === "rifiuti";

  useEffect(() => {
    if (isTemp && TEMP_THRESHOLDS[type]) {
      setThresholdMin(String(TEMP_THRESHOLDS[type].min));
      setThresholdMax(String(TEMP_THRESHOLDS[type].max));
    } else {
      setThresholdMin("");
      setThresholdMax("");
    }
  }, [type]);

  useEffect(() => {
    haccpApi
      .list({ limit: 200 })
      .then((rows) => { setEntries(rows); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : t("cucina.haccp.error_load")))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setLocation(""); setTemp(""); setThresholdMin(""); setThresholdMax("");
    setConforme(null); setCorrectiveAction(""); setOperator(""); setNotes("");
    setSupplier(""); setProduct(""); setLotNumber(""); setExpiryDate("");
    setCleaningProduct(""); setDilution(""); setContactTime("");
    setRecordedAt(new Date().toISOString().slice(0, 16));
  }

  async function save() {
    if (!recordedAt) return;
    const parsedTemp = temp.trim() ? Number.parseFloat(temp.replace(",", ".")) : null;
    if (temp.trim() && (parsedTemp === null || Number.isNaN(parsedTemp))) {
      setError(t("cucina.haccp.error_temp")); return;
    }
    const parsedMin = thresholdMin.trim() ? Number.parseFloat(thresholdMin.replace(",", ".")) : null;
    const parsedMax = thresholdMax.trim() ? Number.parseFloat(thresholdMax.replace(",", ".")) : null;

    let autoConforme = conforme;
    if (isTemp && parsedTemp != null && parsedMin != null && parsedMax != null) {
      autoConforme = parsedTemp >= parsedMin && parsedTemp <= parsedMax;
    }

    setSaving(true); setError(null);
    try {
      const payload: HaccpCreatePayload = {
        type,
        recordedAt: new Date(recordedAt).toISOString(),
        location: location.trim(),
        tempC: parsedTemp,
        thresholdMin: parsedMin,
        thresholdMax: parsedMax,
        conforme: autoConforme,
        correctiveAction: correctiveAction.trim(),
        operator: operator.trim(),
        notes: notes.trim(),
        supplier: supplier.trim(),
        product: product.trim(),
        lotNumber: lotNumber.trim(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        cleaningProduct: cleaningProduct.trim(),
        dilution: dilution.trim(),
        contactTime: contactTime.trim(),
      };
      const created = await haccpApi.create(payload);
      setEntries((prev) => [created, ...prev]);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cucina.haccp.error_save"));
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(id: string) {
    try {
      await haccpApi.delete(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cucina.haccp.error_delete"));
    }
  }

  const filteredEntries = filterType === "all" ? entries : entries.filter((e) => e.type === filterType);
  const printDate = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  const inputCls = "w-full rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent";
  const labelCls = "mb-1 block text-xs font-semibold text-rw-muted";

  function conformeBadge(row: ApiHaccpEntry) {
    if (row.conforme === true) return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400"><CheckCircle2 className="h-3 w-3" />{t("cucina.haccp.conforme")}</span>;
    if (row.conforme === false) return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400"><AlertTriangle className="h-3 w-3" />{t("cucina.haccp.non_conforme")}</span>;
    return <span className="text-[10px] text-rw-muted">—</span>;
  }

  return (
    <div className="space-y-6">
      {/* Legal Reference Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4" data-no-print>
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div className="text-xs text-rw-muted">
          <p className="font-semibold text-blue-400">{t("cucina.haccp.legal_ref")}</p>
          <p className="mt-1">{t("cucina.haccp.legal_desc")}</p>
        </div>
      </div>

      {/* Registration Form */}
      <div data-no-print>
        <Card title={t("cucina.haccp.register_title")} description={t("cucina.haccp.register_desc")}>
          <div className="space-y-4">
            {/* Type + DateTime */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>{t("cucina.haccp.type_label")}</span>
                <select value={type} onChange={(e) => setType(e.target.value as ApiHaccpEntry["type"])} className={inputCls}>
                  {Object.entries(GROUP_LABELS).map(([gKey, gLabel]) => (
                    <optgroup key={gKey} label={gLabel}>
                      {HACCP_TYPES.filter((tp) => tp.group === gKey).map((tp) => (
                        <option key={tp.value} value={tp.value}>{HACCP_TYPE_LABELS[tp.value]}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>{t("cucina.haccp.datetime")}</span>
                <input type="datetime-local" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} className={inputCls} />
              </label>
            </div>

            {/* Location + Operator (always shown) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>{t("cucina.haccp.location")}</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("cucina.haccp.location_placeholder")} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>{t("cucina.haccp.operator_label")}</span>
                <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder={t("cucina.haccp.operator_placeholder")} className={inputCls} />
              </label>
            </div>

            {/* Temperature fields */}
            {isTemp && (
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className={labelCls}>{t("cucina.haccp.temp")}</span>
                  <div className="flex items-center gap-2">
                    <ThermometerSun className="h-4 w-4 text-rw-muted" />
                    <input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder={t("cucina.haccp.temp_placeholder")} className={cn(inputCls, "flex-1")} />
                  </div>
                </label>
                <label className="block">
                  <span className={labelCls}>{t("cucina.haccp.threshold_min")}</span>
                  <input value={thresholdMin} onChange={(e) => setThresholdMin(e.target.value)} placeholder="Min °C" className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>{t("cucina.haccp.threshold_max")}</span>
                  <input value={thresholdMax} onChange={(e) => setThresholdMax(e.target.value)} placeholder="Max °C" className={inputCls} />
                </label>
              </div>
            )}

            {/* Goods receiving fields */}
            {isRicezione && (
              <div className="space-y-4 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/30 p-4">
                <p className="text-xs font-bold text-rw-muted">{t("cucina.haccp.ricezione_section")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.supplier")}</span>
                    <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder={t("cucina.haccp.supplier_placeholder")} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.product")}</span>
                    <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("cucina.haccp.product_placeholder")} className={inputCls} />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.lot_number")}</span>
                    <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="LOT-2026-001" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.expiry_date")}</span>
                    <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.temp")}</span>
                    <input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder={t("cucina.haccp.temp_arrival")} className={inputCls} />
                  </label>
                </div>
              </div>
            )}

            {/* Sanificazione / Pulizia / Acqua potabile fields */}
            {isSanificazione && (
              <div className="space-y-4 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/30 p-4">
                <p className="text-xs font-bold text-rw-muted">{t("cucina.haccp.sanificazione_section")}</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.cleaning_product")}</span>
                    <input value={cleaningProduct} onChange={(e) => setCleaningProduct(e.target.value)} placeholder={t("cucina.haccp.cleaning_placeholder")} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.dilution")}</span>
                    <input value={dilution} onChange={(e) => setDilution(e.target.value)} placeholder="es. 1:100" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.contact_time")}</span>
                    <input value={contactTime} onChange={(e) => setContactTime(e.target.value)} placeholder="es. 15 min" className={inputCls} />
                  </label>
                </div>
              </div>
            )}

            {/* Disinfestazione fields */}
            {isDisinfestazione && (
              <div className="space-y-4 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/30 p-4">
                <p className="text-xs font-bold text-rw-muted">{t("cucina.haccp.disinfestazione_section")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.pest_company")}</span>
                    <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder={t("cucina.haccp.pest_company_placeholder")} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("cucina.haccp.pest_product")}</span>
                    <input value={cleaningProduct} onChange={(e) => setCleaningProduct(e.target.value)} placeholder={t("cucina.haccp.pest_product_placeholder")} className={inputCls} />
                  </label>
                </div>
              </div>
            )}

            {/* Allergeni fields */}
            {isAllergeni && (
              <div className="space-y-4 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/30 p-4">
                <p className="text-xs font-bold text-rw-muted">{t("cucina.haccp.allergeni_section")}</p>
                <label className="block">
                  <span className={labelCls}>{t("cucina.haccp.product")}</span>
                  <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("cucina.haccp.allergeni_product_placeholder")} className={inputCls} />
                </label>
              </div>
            )}

            {/* Formazione fields */}
            {isFormazione && (
              <div className="space-y-4 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/30 p-4">
                <p className="text-xs font-bold text-rw-muted">{t("cucina.haccp.formazione_section")}</p>
                <label className="block">
                  <span className={labelCls}>{t("cucina.haccp.training_topic")}</span>
                  <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("cucina.haccp.training_topic_placeholder")} className={inputCls} />
                </label>
              </div>
            )}

            {/* Rifiuti fields */}
            {isRifiuti && (
              <div className="space-y-4 rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/30 p-4">
                <p className="text-xs font-bold text-rw-muted">{t("cucina.haccp.rifiuti_section")}</p>
                <label className="block">
                  <span className={labelCls}>{t("cucina.haccp.waste_type")}</span>
                  <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("cucina.haccp.waste_type_placeholder")} className={inputCls} />
                </label>
              </div>
            )}

            {/* Conformità + Azione correttiva */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>{t("cucina.haccp.conforme_label")}</span>
                <select value={conforme === null ? "" : conforme ? "true" : "false"} onChange={(e) => setConforme(e.target.value === "" ? null : e.target.value === "true")} className={inputCls}>
                  <option value="">—</option>
                  <option value="true">{t("cucina.haccp.conforme")}</option>
                  <option value="false">{t("cucina.haccp.non_conforme")}</option>
                </select>
              </label>
              {(conforme === false || isNonConformita) && (
                <label className="block">
                  <span className={labelCls}>{t("cucina.haccp.corrective_action")}</span>
                  <input value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} placeholder={t("cucina.haccp.corrective_placeholder")} className={inputCls} />
                </label>
              )}
            </div>

            {/* Notes */}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("cucina.haccp.notes_placeholder")} rows={2} className={inputCls} />

            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85 disabled:opacity-50">
              {saving ? t("cucina.saving") : t("cucina.haccp.register_btn")}
            </button>
          </div>
        </Card>
      </div>

      {/* History + Print */}
      <Card
        title={t("cucina.haccp.history_title")}
        description={loading ? t("ui.loading") : t("cucina.haccp.history_desc").replace("{n}", String(filteredEntries.length))}
        headerRight={
          <div className="flex items-center gap-2">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-rw-line bg-rw-bg px-2 py-1 text-xs text-rw-ink" data-no-print>
              <option value="all">{t("cucina.haccp.filter_all")}</option>
              {HACCP_TYPES.map((tp) => (
                <option key={tp.value} value={tp.value}>{HACCP_TYPE_LABELS[tp.value]}</option>
              ))}
            </select>
            {filteredEntries.length > 0 && (
              <button type="button" data-no-print onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-4 py-2 text-sm font-semibold text-rw-soft hover:text-rw-ink transition">
                {t("cucina.haccp.print_btn")}
              </button>
            )}
          </div>
        }
      >
        <div data-print-content>
          <div className="hidden" style={{ display: "none" }} ref={(el) => { if (el) el.setAttribute("data-print-header", "true"); }} />
          <style>{`@media print { [data-print-header] { display: block !important; } [data-print-header-hide] { display: none !important; } }`}</style>

          {/* Print Header */}
          <div data-print-header style={{ display: "none" }} className="mb-6 border-b-2 border-black pb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold uppercase tracking-wide">{t("cucina.haccp.doc_title")}</div>
                <div className="text-sm mt-1">{t("cucina.haccp.doc_subtitle")}</div>
                <div className="text-sm">Reg. CE 852/2004 — Reg. CE 178/2002 — D.Lgs. 193/2007</div>
                <div className="text-sm">D.Lgs. 231/2017 (allergeni) — Reg. CE 1169/2011</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{t("cucina.haccp.print_date").replace("{date}", printDate)}</div>
                <div className="mt-1">{t("cucina.haccp.print_count").replace("{n}", String(filteredEntries.length))}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-8 text-sm">
              <div><span className="font-semibold">{t("cucina.haccp.structure")}</span><span className="ml-2 border-b border-black inline-block w-40">&nbsp;</span></div>
              <div><span className="font-semibold">{t("cucina.haccp.responsible")}</span><span className="ml-2 border-b border-black inline-block w-32">&nbsp;</span></div>
            </div>
          </div>

          {!loading && filteredEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-rw-muted">{t("cucina.haccp.empty")}</p>
          ) : (
            <>
              {/* Screen version */}
              <div data-print-header-hide>
                <DataTable
                  columns={[
                    { key: "recordedAt", header: t("cucina.haccp.col_datetime"), render: (r: ApiHaccpEntry) => <span className="text-rw-ink">{new Date(r.recordedAt).toLocaleString("it-IT")}</span> },
                    { key: "type", header: t("cucina.haccp.col_type"), render: (r: ApiHaccpEntry) => <span className="text-rw-soft">{HACCP_TYPE_LABELS[r.type] ?? r.type}</span> },
                    { key: "location", header: t("cucina.haccp.col_location") },
                    { key: "tempC", header: t("cucina.haccp.col_temp"), render: (r: ApiHaccpEntry) => r.tempC != null ? <span className={cn("font-semibold", r.conforme === false ? "text-red-400" : r.conforme === true ? "text-emerald-400" : "text-rw-ink")}>{r.tempC.toFixed(1)}°</span> : <span className="text-rw-muted">—</span> },
                    { key: "conforme", header: t("cucina.haccp.col_conforme"), render: (r: ApiHaccpEntry) => conformeBadge(r) },
                    { key: "operator", header: t("cucina.haccp.col_operator") },
                    { key: "detail", header: t("cucina.haccp.col_detail"), render: (r: ApiHaccpEntry) => {
                      const parts: string[] = [];
                      if (r.supplier) parts.push(r.supplier);
                      if (r.product) parts.push(r.product);
                      if (r.lotNumber) parts.push(`Lotto: ${r.lotNumber}`);
                      if (r.cleaningProduct) parts.push(r.cleaningProduct);
                      if (r.correctiveAction) parts.push(`AC: ${r.correctiveAction}`);
                      if (r.notes) parts.push(r.notes);
                      return <span className="text-xs text-rw-muted">{parts.join(" · ") || "—"}</span>;
                    }},
                    { key: "actions", header: "", render: (r: ApiHaccpEntry) => (
                      <button type="button" onClick={() => removeEntry(r.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20">{t("ui.delete")}</button>
                    )},
                  ]}
                  data={filteredEntries}
                  keyExtractor={(r) => r.id}
                />
              </div>

              {/* Print version */}
              <table style={{ display: "none" }} data-print-header className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left text-xs font-bold">{t("cucina.haccp.col_datetime_full")}</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left text-xs font-bold">{t("cucina.haccp.col_type_full")}</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left text-xs font-bold">{t("cucina.haccp.col_location")}</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-center text-xs font-bold">{t("cucina.haccp.col_temp")}</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-center text-xs font-bold">{t("cucina.haccp.col_limits")}</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-center text-xs font-bold">{t("cucina.haccp.col_conforme")}</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left text-xs font-bold">{t("cucina.haccp.col_operator")}</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left text-xs font-bold">{t("cucina.haccp.col_detail_print")}</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-left text-xs font-bold">{t("cucina.haccp.col_corrective")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((r) => (
                    <tr key={r.id}>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{new Date(r.recordedAt).toLocaleString("it-IT")}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{HACCP_TYPE_LABELS[r.type] ?? r.type}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{r.location || "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-center font-semibold">{r.tempC != null ? `${r.tempC.toFixed(1)}°` : "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-center">{r.thresholdMin != null && r.thresholdMax != null ? `${r.thresholdMin}°/${r.thresholdMax}°` : "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-center font-bold">{r.conforme === true ? "CONFORME" : r.conforme === false ? "NON CONFORME" : "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{r.operator || "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{[r.supplier, r.product, r.lotNumber ? `Lotto: ${r.lotNumber}` : "", r.cleaningProduct, r.notes].filter(Boolean).join(", ") || "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs">{r.correctiveAction || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Print Footer */}
          <div data-print-header style={{ display: "none" }} className="mt-10 grid grid-cols-3 gap-10 text-sm">
            <div>
              <div className="mb-8 font-semibold">{t("cucina.haccp.sign_operator")}</div>
              <div className="border-b border-black w-full">&nbsp;</div>
              <div className="mt-1 text-xs text-gray-600">{t("cucina.haccp.name_sign")}</div>
            </div>
            <div>
              <div className="mb-8 font-semibold">{t("cucina.haccp.sign_responsible")}</div>
              <div className="border-b border-black w-full">&nbsp;</div>
              <div className="mt-1 text-xs text-gray-600">{t("cucina.haccp.name_sign")}</div>
            </div>
            <div>
              <div className="mb-8 font-semibold">{t("cucina.haccp.sign_legal")}</div>
              <div className="border-b border-black w-full">&nbsp;</div>
              <div className="mt-1 text-xs text-gray-600">{t("cucina.haccp.name_sign")}</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TurniTab() {
  const { t } = useI18n();
  const [shifts, setShifts] = useState<ShiftPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [hours, setHours] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    shiftPlansApi
      .list({ area: "cucina" })
      .then(setShifts)
      .catch((e) => setError(e instanceof Error ? e.message : t("cucina.turni.error_load")))
      .finally(() => setLoading(false));
  }, []);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await shiftPlansApi.create({ area: "cucina", day, staffName: name.trim(), hours: hours.trim(), role: role.trim() });
      setShifts((prev) => [...prev, created].sort((a, b) => a.day.localeCompare(b.day)));
      setName(""); setHours(""); setRole("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cucina.turni.error_save"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await shiftPlansApi.delete(id);
      setShifts((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cucina.turni.error_delete"));
    }
  }

  const grouped = shifts.reduce<Record<string, ShiftPlan[]>>((acc, s) => {
    const k = s.day || t("cucina.turni.no_date");
    if (!acc[k]) acc[k] = [];
    acc[k].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card title={t("cucina.turni.add_title")} description={t("cucina.turni.desc")}>
        <div className="space-y-4">
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-full rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink focus:outline-none focus:ring-1 focus:ring-rw-accent" />
          <div className="grid gap-4 sm:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("cucina.turni.name_placeholder")} className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
            <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder={t("cucina.turni.hours_placeholder")} className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t("cucina.turni.role_placeholder")} className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="button" onClick={() => void add()} disabled={saving || !name.trim()} className="flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? t("cucina.saving") : t("cucina.turni.add_btn")}
          </button>
        </div>
      </Card>

      {loading && <p className="text-sm text-rw-muted text-center">{t("cucina.turni.loading")}</p>}
      {!loading && shifts.length === 0 && <p className="text-sm text-rw-muted text-center py-4">{t("cucina.turni.empty")}</p>}

      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([d, dayShifts]) => (
        <Card key={d} title={d ? new Date(d + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : t("cucina.turni.no_date")} description={t("cucina.turni.staff_count").replace("{n}", String(dayShifts.length))}>
          <div className="space-y-1">
            {dayShifts.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2">
                <div>
                  <span className="font-semibold text-sm text-rw-ink">{s.staffName}</span>
                  {s.hours && <span className="ml-2 text-xs text-rw-muted">{s.hours}</span>}
                  {s.role && <span className="ml-2 rounded bg-rw-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-rw-accent">{s.role}</span>}
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

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function CucinaPage() {
  const { t } = useI18n();
  const { getOrdersForArea, patchStatus, stockAlerts, clearStockAlerts, loadError } = useOrders();
  const [activeTab, setActiveTab] = useState("comande");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSnapshot, setAiSnapshot] = useState<KitchenOperationalSnapshot | null>(null);
  const [rsOrders, setRsOrders] = useState<RoomServiceOrder[]>([]);

  useEffect(() => {
    aiOpsApi
      .kitchenOperationalInsights(14)
      .then(setAiSnapshot)
      .catch((error) => console.error("Failed to fetch kitchen operational insights:", error));
  }, []);

  useEffect(() => {
    roomServiceApi.list({ category: "food" }).then(setRsOrders).catch(() => {});
    const timer = setInterval(() => roomServiceApi.list({ category: "food" }).then(setRsOrders).catch(() => {}), 30_000);
    return () => clearInterval(timer);
  }, []);

  const rsActive = rsOrders.filter((o) => !["delivered", "cancelled"].includes(o.status));

  const kitchenOrders = getOrdersForArea("cucina");

  const classified = useMemo(() => {
    const inAttesa: { order: Order; kds: KdsState }[] = [];
    const inPrep: { order: Order; kds: KdsState }[] = [];
    const pronti: { order: Order; kds: KdsState }[] = [];

    for (const order of kitchenOrders) {
      const kds = getKitchenDisplayState(order);
      if (!kds) continue;
      if (kds.status === "in_attesa" || kds.status === "queued") inAttesa.push({ order, kds });
      else if (kds.status === "in_preparazione") inPrep.push({ order, kds });
      else if (kds.status === "pronto") pronti.push({ order, kds });
    }

    return { inAttesa, inPrep, pronti };
  }, [kitchenOrders]);

  const lateCount = kitchenOrders.filter((o) => minutesSince(o.createdAt) > 15).length;

  const translatedTabs = TABS.map((tab) => {
    const label = t(`cucina.tab.${tab.id}`);
    if (tab.id === "room-service" && rsActive.length > 0) {
      return { ...tab, label: `${label} (${rsActive.length})` };
    }
    return { ...tab, label };
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.cucina.label")} subtitle={t("cucina.subtitle")}>
        <Chip label={t("cucina.kds.chip_orders")} value={kitchenOrders.length} tone="info" />
        <Chip label={t("cucina.kds.chip_in_prep")} value={classified.inPrep.length} tone="accent" />
        <Chip label={t("cucina.kds.chip_pronti")} value={classified.pronti.length} tone="success" />
        <Chip label={t("cucina.kds.chip_late")} value={lateCount} tone={lateCount > 0 ? "danger" : "default"} />
        <VoiceButton onResult={(text) => alert(t("cucina.kds.voice_cmd").replace("{text}", text))} />
        <AiToggleButton onClick={() => setAiOpen(true)} label={t("cucina.ai_label")} />
      </PageHeader>

      <TabBar
        tabs={translatedTabs}
        active={activeTab}
        onChange={setActiveTab}
      />

      <LoadErrorBanner message={loadError} />
      <StockAlertBanner alerts={stockAlerts} onClose={clearStockAlerts} />

      {activeTab === "comande" && (
        <div className="space-y-4">
          {aiSnapshot && (
            <Card title={t("cucina.ai.title")} description={t("cucina.ai.desc")}>
              <div className="grid gap-2 sm:grid-cols-4">
                <Chip label={t("cucina.ai.loss_dishes")} value={aiSnapshot.kpi.lossDishes} tone={aiSnapshot.kpi.lossDishes > 0 ? "danger" : "default"} />
                <Chip label={t("cucina.ai.low_margin")} value={aiSnapshot.kpi.lowMarginDishes} tone={aiSnapshot.kpi.lowMarginDishes > 0 ? "warn" : "default"} />
                <Chip label={t("cucina.ai.expiring_lots")} value={aiSnapshot.kpi.expiringLots} tone={aiSnapshot.kpi.expiringLots > 0 ? "danger" : "default"} />
                <Chip label={t("cucina.ai.stagnant")} value={aiSnapshot.kpi.stagnantProducts} tone={aiSnapshot.kpi.stagnantProducts > 0 ? "warn" : "default"} />
              </div>
              <div className="mt-3 space-y-2 text-sm text-rw-soft">
                {aiSnapshot.foodCost
                  .filter((dish) => dish.status !== "healthy")
                  .slice(0, 3)
                  .map((dish) => (
                  <p key={dish.menuItem}>
                    <span className="font-semibold text-rw-ink">{dish.menuItem}</span>
                    {" "}{t("cucina.ai.costo_label")}{" "}
                    {dish.plateCost.toFixed(2)} EUR, {t("cucina.ai.prezzo_label")}{" "}
                    {dish.price.toFixed(2)} EUR, {dish.status === "loss" ? t("cucina.ai.status_loss") : t("cucina.ai.status_low_margin")}
                  </p>
                  ))}
                {aiSnapshot.reorder.slice(0, 2).map((item) => (
                  <p key={item.warehouseItemId}>
                    {t("cucina.ai.reorder")
                      .replace("{qty}", String(item.suggestedOrderQty))
                      .replace("{unit}", item.unit)
                      .replace("{name}", item.name)
                      .replace("{eta}", item.eta ?? "")}
                  </p>
                ))}
              </div>
            </Card>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <KdsColumn title={t("cucina.kds.col_waiting")} tone="pending" count={classified.inAttesa.length}>
              {classified.inAttesa.map(({ order, kds }) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  kds={kds}
                  onInPrep={() => patchStatus(order.id, "in_preparazione")}
                  onPronto={() => patchStatus(order.id, "pronto")}
                  onServito={() => patchStatus(order.id, "servito")}
                />
              ))}
              {classified.inAttesa.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">{t("cucina.kds.empty_waiting")}</p>}
            </KdsColumn>

            <KdsColumn title={t("cucina.kds.col_in_prep")} tone="prep" count={classified.inPrep.length}>
              {classified.inPrep.map(({ order, kds }) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  kds={kds}
                  onInPrep={() => patchStatus(order.id, "in_preparazione")}
                  onPronto={() => patchStatus(order.id, "pronto")}
                  onServito={() => patchStatus(order.id, "servito")}
                />
              ))}
              {classified.inPrep.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">{t("cucina.kds.empty_in_prep")}</p>}
            </KdsColumn>

            <KdsColumn title={t("cucina.kds.col_ready")} tone="ready" count={classified.pronti.length}>
              {classified.pronti.map(({ order, kds }) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  kds={kds}
                  onInPrep={() => patchStatus(order.id, "in_preparazione")}
                  onPronto={() => patchStatus(order.id, "pronto")}
                  onServito={() => patchStatus(order.id, "servito")}
                />
              ))}
              {classified.pronti.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">{t("cucina.kds.empty_ready")}</p>}
            </KdsColumn>
          </div>
        </div>
      )}

      {activeTab === "ricette" && <RicetteTab />}
      {activeTab === "piatti-giorno" && <PiattiGiornoTab />}
      {activeTab === "haccp" && <HaccpTab />}
      {activeTab === "room-service" && (
        <div className="space-y-4">
          <Card title={t("cucina.room_service.title")} description={t("cucina.room_service.desc")}>
            {rsActive.length === 0 ? (
              <p className="py-6 text-center text-sm text-rw-muted">{t("cucina.room_service.empty")}</p>
            ) : (
              <div className="space-y-3">
                {rsActive.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400">
                          {t("cucina.room_service.camera").replace("{code}", o.roomCode)}
                        </span>
                        <span className="text-sm font-semibold text-rw-ink">{o.guestName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = o.status === "pending" ? "in_preparation" : o.status === "in_preparation" ? "out_for_delivery" : "delivered";
                          roomServiceApi.update(o.id, { status: next as RoomServiceOrder["status"] })
                            .then((updated) => setRsOrders((prev) => prev.map((r) => r.id === o.id ? updated : r)))
                            .catch(() => {});
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/30 transition"
                      >
                        {o.status === "pending" ? t("cucina.room_service.start") : o.status === "in_preparation" ? t("cucina.room_service.ready") : t("cucina.room_service.delivered")}
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {(o.items as Array<{name: string; qty: number; unitPrice: number}>).map((it, i) => (
                        <p key={i} className="text-xs text-rw-muted">{it.qty}× {it.name}</p>
                      ))}
                    </div>
                    {o.notes && <p className="mt-2 text-xs text-rw-muted italic">&quot;{o.notes}&quot;</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "turni" && <TurniTab />}

      <AiChat context="cucina" open={aiOpen} onClose={() => setAiOpen(false)} title={t("cucina.ai_label")} />
    </div>
  );
}
