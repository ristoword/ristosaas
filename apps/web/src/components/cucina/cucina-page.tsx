"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Clock, Flame, Minus, Plus, Printer, ThermometerSun, Trash2, Upload, Users, UtensilsCrossed } from "lucide-react";
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
import { aiOpsApi, type KitchenOperationalSnapshot } from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type HaccpEntry = { id: string; date: string; temp: string; operator: string; notes: string };
type Shift = { id: string; day: string; name: string; hours: string; role: string };

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

function CourseIndicators({ order }: { order: Order }) {
  const nums = getSortedCourses(order.items);
  return (
    <span className="flex items-center gap-1">
      {nums.map((n) => {
        const st = order.courseStates[String(n)];
        const color =
          st === "servito"
            ? "bg-rw-muted/40"
            : st === "in_attesa" || st === "in_preparazione" || st === "pronto"
              ? "bg-emerald-400"
              : "bg-red-400";
        return <span key={n} className={`h-2 w-2 rounded-full ${color}`} title={`Portata ${n}: ${st}`} />;
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
  const elapsed = minutesSince(order.createdAt);
  const courseItems = order.items.filter((i) => i.course === kds.courseNum && i.area === "cucina");

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

      <div className="text-xs text-rw-muted font-semibold uppercase tracking-wide">
        Portata {kds.courseNum}
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
        {courseItems.length === 0 && (
          <li className="text-xs text-rw-muted italic">Nessun item cucina</li>
        )}
      </ul>

      <div className="flex items-center gap-2 pt-1">
        {kds.status === "in_attesa" && (
          <button type="button" onClick={onInPrep} className="flex-1 rounded-lg bg-rw-accent/15 px-3 py-1.5 text-xs font-bold text-rw-accent transition hover:bg-rw-accent/25">
            In prep
          </button>
        )}
        {kds.status === "in_preparazione" && (
          <button type="button" onClick={onPronto} className="flex-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/25">
            Pronto
          </button>
        )}
        {kds.status === "pronto" && kds.isLast && (
          <button type="button" onClick={onServito} className="flex-1 rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-400 transition hover:bg-blue-500/25">
            Servito
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

function RicetteTab() {
  const { recipes, addRecipe, removeRecipe, addToMenu, addToDailyMenu } = useMenu();

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

  function save() {
    if (!name.trim()) return;
    addRecipe(draftRecipe);
    resetForm();
    showFlash("Ricetta salvata. Food cost calcolato.");
  }

  function handleAddToMenu(recipe: Recipe) {
    addToMenu(recipe);
    showFlash(`"${recipe.name}" aggiunto al menu.`);
  }

  function handleAddToDaily(recipe: Recipe) {
    addToDailyMenu(recipe, `Dal ricettario cucina`);
    showFlash(`"${recipe.name}" aggiunto al menu del giorno.`);
  }

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  const categories = ["Antipasti", "Primi", "Secondi", "Pizze", "Dolci", "Contorni", "Bevande"];

  return (
    <div className="space-y-6">
      {flash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300" role="status">
          {flash}
        </div>
      )}

      <Card title="Nuova ricetta" description="Compila tutti i dettagli: il food cost si calcola in automatico">
        <div className="space-y-5">
          {/* Basic info */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome ricetta</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Carbonara tradizionale" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Area</label>
              <select value={area} onChange={(e) => setArea(e.target.value as typeof area)} className={inputCls}>
                <option value="cucina">Cucina</option>
                <option value="pizzeria">Pizzeria</option>
                <option value="bar">Bar</option>
              </select>
            </div>
          </div>

          {/* Pricing & portions */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className={labelCls}>Porzioni</label>
              <input type="number" min={1} value={portions} onChange={(e) => setPortions(Number(e.target.value) || 1)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prezzo vendita (€)</label>
              <input type="number" step="0.50" min={0} value={sellingPrice || ""} onChange={(e) => setSellingPrice(Number(e.target.value))} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Target FC %</label>
              <input type="number" min={0} max={100} value={targetFcPct} onChange={(e) => setTargetFcPct(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>IVA %</label>
              <input type="number" min={0} value={ivaPct} onChange={(e) => setIvaPct(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Overhead %</label>
              <input type="number" min={0} value={overheadPct} onChange={(e) => setOverheadPct(Number(e.target.value))} className={inputCls} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Packaging (€)</label>
              <input type="number" step="0.01" min={0} value={packagingCost || ""} onChange={(e) => setPackagingCost(Number(e.target.value))} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Manodopera (€)</label>
              <input type="number" step="0.01" min={0} value={laborCost || ""} onChange={(e) => setLaborCost(Number(e.target.value))} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Energia (€)</label>
              <input type="number" step="0.01" min={0} value={energyCost || ""} onChange={(e) => setEnergyCost(Number(e.target.value))} placeholder="0.00" className={inputCls} />
            </div>
          </div>

          {/* Ingredients table */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted mb-2">Ingredienti</p>
            <div className="overflow-x-auto rounded-xl border border-rw-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Ingrediente</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-20">Qtà</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-16">Unità</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-24">€/unità</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted w-20">Scarto%</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted w-20">Totale</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => {
                    const lineTotal = ing.qty * ing.unitCost * (1 + ing.wastePct / 100);
                    return (
                      <tr key={ing.id} className="border-b border-rw-line/50">
                        <td className="px-2 py-1.5">
                          <input value={ing.name} onChange={(e) => updateIng(idx, "name", e.target.value)} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none" placeholder="Nome ingrediente" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.01" min={0} value={ing.qty || ""} onChange={(e) => updateIng(idx, "qty", Number(e.target.value))} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none tabular-nums" placeholder="0" />
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
                          <input type="number" step="0.01" min={0} value={ing.unitCost || ""} onChange={(e) => updateIng(idx, "unitCost", Number(e.target.value))} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none tabular-nums" placeholder="0.00" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={0} max={100} value={ing.wastePct || ""} onChange={(e) => updateIng(idx, "wastePct", Number(e.target.value))} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none tabular-nums" placeholder="0" />
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
              <Plus className="h-3.5 w-3.5" /> Aggiungi ingrediente
            </button>
          </div>

          {/* Procedure steps */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted mb-2">Procedimento (passaggi)</p>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-2">
                  <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rw-accent/15 text-xs font-bold text-rw-accent">
                    {idx + 1}
                  </span>
                  <textarea
                    value={step.text}
                    onChange={(e) => updateStep(idx, e.target.value)}
                    placeholder={`Passaggio ${idx + 1}: descrivi cosa fare…`}
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
              <Plus className="h-3.5 w-3.5" /> Aggiungi passaggio
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Note aggiuntive</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergie, varianti, consigli…" rows={2} className={cn(inputCls, "resize-y")} />
          </div>

          {/* Live food cost */}
          {ingredients.some((i) => i.name.trim()) && sellingPrice > 0 && (
            <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-rw-accent">Food Cost automatico</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                {[
                  { l: "Costo ingredienti", v: `€${fc.ingredientCost.toFixed(2)}` },
                  { l: "Costo porzione", v: `€${fc.portionCost.toFixed(2)}` },
                  { l: "FC%", v: `${fc.fcPct.toFixed(1)}%`, warn: fc.fcPct > targetFcPct },
                  { l: "Margine", v: `€${fc.margin.toFixed(2)}`, warn: fc.margin < 0 },
                  { l: "Costo produzione", v: `€${fc.productionCost.toFixed(2)}` },
                  { l: "Con overhead", v: `€${fc.withOverhead.toFixed(2)}` },
                  { l: "Prezzo suggerito", v: `€${fc.suggestedPrice.toFixed(2)}` },
                  { l: "Prezzo vendita", v: `€${sellingPrice.toFixed(2)}` },
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
          <button type="button" onClick={save} disabled={!name.trim()} className="w-full rounded-xl bg-rw-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-rw-accent/85 disabled:cursor-not-allowed disabled:opacity-40">
            Salva ricetta (food cost calcolato automaticamente)
          </button>
        </div>
      </Card>

      {/* Saved recipes */}
      {recipes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-rw-ink">Ricette salvate ({recipes.length})</h3>
          {recipes.map((r) => {
            const rfc = calcFoodCost(r);
            return (
              <div key={r.id} className="rounded-xl border border-rw-line bg-rw-surface p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-rw-ink">{r.name}</p>
                    <p className="text-xs text-rw-muted">{r.category} · {r.area} · {r.portions} porz. · €{r.sellingPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn("rounded-full px-2.5 py-1 font-bold", rfc.fcPct > r.targetFcPct ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400")}>
                      FC {rfc.fcPct.toFixed(1)}%
                    </span>
                    <span className="rounded-full bg-rw-surfaceAlt px-2.5 py-1 font-bold text-rw-soft">
                      Margine €{rfc.margin.toFixed(2)}
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
                    {r.steps.length} passaggi: {r.steps.map((s) => s.text.slice(0, 30)).join(" → ")}…
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => handleAddToMenu(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-rw-accent/30 bg-rw-accent/10 px-3 py-2 text-xs font-bold text-rw-accent hover:bg-rw-accent/20">
                    <Upload className="h-3.5 w-3.5" /> Carica nel Menu
                  </button>
                  <button type="button" onClick={() => handleAddToDaily(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20">
                    <BookOpen className="h-3.5 w-3.5" /> Carica nel Menu del Giorno
                  </button>
                  <button type="button" onClick={() => removeRecipe(r.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" /> Elimina
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PiattiGiornoTab() {
  const { dailyDishes, addDailyDish, removeDailyDish, recipes, addToDailyMenu } = useMenu();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("Primi");
  const [price, setPrice] = useState(0);
  const [allergens, setAllergens] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const categories = ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci"];

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addDailyDish({ name, description: desc, category: cat, price, allergens, recipeId: null });
    setName(""); setDesc(""); setPrice(0); setAllergens("");
    showFlash("Piatto del giorno aggiunto.");
  }

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  function handleFromRecipe(recipe: Recipe) {
    addToDailyMenu(recipe, `Dal ricettario cucina`);
    showFlash(`"${recipe.name}" aggiunto al menu del giorno.`);
  }

  function handlePrint() {
    window.print();
  }

  const grouped = categories
    .map((c) => ({ category: c, items: dailyDishes.filter((d) => d.category === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {flash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300" role="status">
          {flash}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add new daily dish */}
        <Card title="Nuovo piatto del giorno" description="Crea un singolo piatto o completa un menu">
          <form className="space-y-3" onSubmit={add}>
            <div>
              <label className={labelCls}>Nome piatto</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Risotto alla milanese" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Descrizione</label>
              <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Breve descrizione" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Categoria</label>
                <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Prezzo (€)</label>
                <input type="number" step="0.50" min={0} value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} placeholder="0.00" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Allergeni</label>
              <input type="text" value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="Glutine, Lattosio..." className={inputCls} />
            </div>
            <button type="submit" className="w-full rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85">
              <Plus className="mr-1 inline h-4 w-4" /> Aggiungi piatto del giorno
            </button>
          </form>
        </Card>

        {/* Import from recipes */}
        {recipes.length > 0 && (
          <Card title="Importa da ricette" description="Seleziona una ricetta per aggiungerla al menu del giorno">
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
                      <Upload className="h-3.5 w-3.5" /> Aggiungi
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
          title={`Menu del giorno (${dailyDishes.length} piatti)`}
          headerRight={
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg border border-rw-line px-3 py-1.5 text-xs font-semibold text-rw-soft hover:text-rw-ink">
              <Printer className="h-3.5 w-3.5" /> Stampa
            </button>
          }
        >
          {grouped.map((g) => (
            <div key={g.category} className="mb-3">
              <p className="text-xs font-bold uppercase tracking-wide text-rw-muted mb-1">{g.category}</p>
              <div className="space-y-1">
                {g.items.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-rw-line/50 bg-rw-surfaceAlt px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-rw-ink">{d.name}</span>
                      {d.description && <span className="text-xs text-rw-muted ml-2">— {d.description}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-rw-accent">€{d.price.toFixed(2)}</span>
                      <button type="button" onClick={() => removeDailyDish(d.id)} className="text-red-400 hover:text-red-300">
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

      {/* Print-only view */}
      <div className="hidden print:block">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Menu del Giorno</h1>
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
                {d.allergens && <p className="text-[10px] text-gray-400 italic">Allergeni: {d.allergens}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HaccpTab() {
  const [entries, setEntries] = useState<HaccpEntry[]>([]);
  const [date, setDate] = useState("");
  const [temp, setTemp] = useState("");
  const [operator, setOperator] = useState("");
  const [notes, setNotes] = useState("");

  function save() {
    if (!date || !temp) return;
    setEntries((prev) => [...prev, { id: `hc-${Date.now()}`, date, temp, operator, notes }]);
    setDate("");
    setTemp("");
    setOperator("");
    setNotes("");
  }

  return (
    <div className="space-y-6">
      <Card title="Registrazione HACCP">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink focus:outline-none focus:ring-1 focus:ring-rw-accent" />
            <div className="flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-rw-muted" />
              <input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="Temperatura °C" className="flex-1 rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
            </div>
          </div>
          <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Operatore" className="w-full rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note…" rows={3} className="w-full rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
          <button type="button" onClick={save} className="rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85">Registra</button>
        </div>
      </Card>

      {entries.length > 0 && (
        <DataTable
          columns={[
            { key: "date", header: "Data" },
            { key: "temp", header: "Temp °C" },
            { key: "operator", header: "Operatore" },
            { key: "notes", header: "Note" },
          ]}
          data={entries}
          keyExtractor={(e) => e.id}
        />
      )}
    </div>
  );
}

function TurniTab() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [day, setDay] = useState("");
  const [name, setName] = useState("");
  const [hours, setHours] = useState("");
  const [role, setRole] = useState("");

  function add() {
    if (!name.trim()) return;
    setShifts((prev) => [...prev, { id: `sh-${Date.now()}`, day, name, hours, role }]);
    setName("");
    setHours("");
    setRole("");
  }

  return (
    <div className="space-y-6">
      <Card title="Aggiungi turno">
        <div className="space-y-4">
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-full rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink focus:outline-none focus:ring-1 focus:ring-rw-accent" />
          <div className="grid gap-4 sm:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
            <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Ore (es. 8-16)" className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ruolo" className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
          </div>
          <button type="button" onClick={add} className="rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85">Aggiungi</button>
        </div>
      </Card>

      {shifts.length > 0 && (
        <DataTable
          columns={[
            { key: "day", header: "Giorno" },
            { key: "name", header: "Nome" },
            { key: "hours", header: "Ore" },
            { key: "role", header: "Ruolo" },
          ]}
          data={shifts}
          keyExtractor={(s) => s.id}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function CucinaPage() {
  const { getOrdersForArea, patchStatus } = useOrders();
  const [activeTab, setActiveTab] = useState("comande");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSnapshot, setAiSnapshot] = useState<KitchenOperationalSnapshot | null>(null);

  useEffect(() => {
    aiOpsApi
      .kitchenOperationalInsights(14)
      .then(setAiSnapshot)
      .catch((error) => console.error("Failed to fetch kitchen operational insights:", error));
  }, []);

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

  return (
    <div className="space-y-6">
      <PageHeader title="Cucina" subtitle="Kitchen Display System">
        <Chip label="Ordini" value={kitchenOrders.length} tone="info" />
        <Chip label="In prep" value={classified.inPrep.length} tone="accent" />
        <Chip label="Pronti" value={classified.pronti.length} tone="success" />
        <Chip label="In ritardo" value={lateCount} tone={lateCount > 0 ? "danger" : "default"} />
        <VoiceButton onResult={(text) => alert(`Comando vocale: ${text}`)} />
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Cucina" />
      </PageHeader>

      <TabBar tabs={[...TABS]} active={activeTab} onChange={setActiveTab} />

      {activeTab === "comande" && (
        <div className="space-y-4">
          {aiSnapshot && (
            <Card title="AI Operativa Cucina" description="Margini, sprechi, riordino e suggerimenti live da DB">
              <div className="grid gap-2 sm:grid-cols-4">
                <Chip label="Piatti in perdita" value={aiSnapshot.kpi.lossDishes} tone={aiSnapshot.kpi.lossDishes > 0 ? "danger" : "default"} />
                <Chip label="Margine basso" value={aiSnapshot.kpi.lowMarginDishes} tone={aiSnapshot.kpi.lowMarginDishes > 0 ? "warn" : "default"} />
                <Chip label="Lotti in scadenza" value={aiSnapshot.kpi.expiringLots} tone={aiSnapshot.kpi.expiringLots > 0 ? "danger" : "default"} />
                <Chip label="Prodotti fermi" value={aiSnapshot.kpi.stagnantProducts} tone={aiSnapshot.kpi.stagnantProducts > 0 ? "warn" : "default"} />
              </div>
              <div className="mt-3 space-y-2 text-sm text-rw-soft">
                {aiSnapshot.foodCost
                  .filter((dish) => dish.status !== "healthy")
                  .slice(0, 3)
                  .map((dish) => (
                  <p key={dish.menuItem}>
                    <span className="font-semibold text-rw-ink">{dish.menuItem}</span>
                    {" -> costo "}
                    {dish.plateCost.toFixed(2)} EUR, prezzo {dish.price.toFixed(2)} EUR, {dish.status === "loss" ? "in perdita" : "margine basso"}
                  </p>
                  ))}
                {aiSnapshot.reorder.slice(0, 2).map((item) => (
                  <p key={item.warehouseItemId}>
                    Ordina {item.suggestedOrderQty} {item.unit} di {item.name} {item.eta}
                  </p>
                ))}
              </div>
            </Card>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <KdsColumn title="In attesa" tone="pending" count={classified.inAttesa.length}>
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
              {classified.inAttesa.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">Nessuna comanda in attesa</p>}
            </KdsColumn>

            <KdsColumn title="In preparazione" tone="prep" count={classified.inPrep.length}>
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
              {classified.inPrep.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">Nessuna comanda in prep</p>}
            </KdsColumn>

            <KdsColumn title="Pronti" tone="ready" count={classified.pronti.length}>
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
              {classified.pronti.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">Nessuna comanda pronta</p>}
            </KdsColumn>
          </div>
        </div>
      )}

      {activeTab === "ricette" && <RicetteTab />}
      {activeTab === "piatti-giorno" && <PiattiGiornoTab />}
      {activeTab === "haccp" && <HaccpTab />}
      {activeTab === "turni" && <TurniTab />}

      <AiChat context="cucina" open={aiOpen} onClose={() => setAiOpen(false)} title="AI Cucina" />
    </div>
  );
}
