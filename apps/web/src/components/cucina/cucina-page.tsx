"use client";

import { useMemo, useState } from "react";
import { Clock, Flame, ThermometerSun, Users, UtensilsCrossed } from "lucide-react";
import { useOrders } from "@/components/orders/orders-context";
import type { CourseStatus, Order, OrderItem } from "@/components/orders/types";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { KdsColumn } from "@/components/shared/kds-column";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Recipe = { id: string; name: string; category: string; ingredients: { name: string; qty: string; unit: string }[]; procedure: string };
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
  { id: "haccp", label: "HACCP" },
  { id: "turni", label: "Turni cucina" },
] as const;

const EMPTY_INGREDIENT = { name: "", qty: "", unit: "" };

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
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [ingredients, setIngredients] = useState([{ ...EMPTY_INGREDIENT }]);
  const [procedure, setProcedure] = useState("");

  function addIngredient() {
    setIngredients((prev) => [...prev, { ...EMPTY_INGREDIENT }]);
  }

  function updateIngredient(idx: number, field: keyof typeof EMPTY_INGREDIENT, value: string) {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  }

  function save() {
    if (!name.trim()) return;
    setRecipes((prev) => [
      ...prev,
      { id: `rec-${Date.now()}`, name, category, ingredients: ingredients.filter((i) => i.name.trim()), procedure },
    ]);
    setName("");
    setCategory("");
    setIngredients([{ ...EMPTY_INGREDIENT }]);
    setProcedure("");
  }

  return (
    <div className="space-y-6">
      <Card title="Nuova ricetta">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome ricetta" className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria" className="rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Ingredienti</p>
            <div className="overflow-x-auto rounded-xl border border-rw-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Nome</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Qtà</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">Unità</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => (
                    <tr key={idx} className="border-b border-rw-line/50">
                      <td className="px-3 py-1.5"><input value={ing.name} onChange={(e) => updateIngredient(idx, "name", e.target.value)} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none" placeholder="Ingrediente" /></td>
                      <td className="px-3 py-1.5"><input value={ing.qty} onChange={(e) => updateIngredient(idx, "qty", e.target.value)} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none" placeholder="0" /></td>
                      <td className="px-3 py-1.5"><input value={ing.unit} onChange={(e) => updateIngredient(idx, "unit", e.target.value)} className="w-full bg-transparent text-sm text-rw-ink focus:outline-none" placeholder="g, ml…" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addIngredient} className="text-xs font-semibold text-rw-accent hover:text-rw-accentSoft">+ Ingrediente</button>
          </div>

          <textarea value={procedure} onChange={(e) => setProcedure(e.target.value)} placeholder="Procedimento…" rows={4} className="w-full rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />

          <button type="button" onClick={save} className="rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85">Salva ricetta</button>
        </div>
      </Card>

      {recipes.length > 0 && (
        <DataTable
          columns={[
            { key: "name", header: "Nome" },
            { key: "category", header: "Categoria" },
            { key: "ingredients", header: "Ingredienti", render: (r) => r.ingredients.map((i) => i.name).join(", ") || "—" },
          ]}
          data={recipes}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessuna ricetta"
        />
      )}
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
      </PageHeader>

      <TabBar tabs={[...TABS]} active={activeTab} onChange={setActiveTab} />

      {activeTab === "comande" && (
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
      )}

      {activeTab === "ricette" && <RicetteTab />}
      {activeTab === "haccp" && <HaccpTab />}
      {activeTab === "turni" && <TurniTab />}
    </div>
  );
}
