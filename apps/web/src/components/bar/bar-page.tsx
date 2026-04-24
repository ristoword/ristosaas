"use client";

import { useMemo, useState } from "react";
import { Mic } from "lucide-react";
import { useOrders } from "@/components/orders/orders-context";
import type { CourseStatus, Order } from "@/components/orders/types";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { KdsColumn } from "@/components/shared/kds-column";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { RecipesTab } from "@/components/shared/recipes-tab";

type VoiceNote = { id: string; text: string; createdAt: string };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function minutesSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

type AreaKdsState = { courseNum: number; status: CourseStatus };

/**
 * Restituisce lo stato corrente per l'area specificata, basandosi sui
 * courseStates del corso con item dell'area non ancora serviti.
 * Stessa logica di getKitchenDisplayState in cucina-page, adattata per area.
 */
function getAreaDisplayState(order: Order, area: string): AreaKdsState | null {
  const areaCourses = [
    ...new Set(order.items.filter((i) => i.area === area).map((i) => i.course)),
  ].sort((a, b) => a - b);
  if (areaCourses.length === 0) return null;
  const current = areaCourses.find(
    (n) => order.courseStates[String(n)] !== "servito",
  );
  if (current == null) return null;
  const rawStatus = order.courseStates[String(current)];
  const status: CourseStatus =
    rawStatus === "in_attesa" ||
    rawStatus === "in_preparazione" ||
    rawStatus === "pronto" ||
    rawStatus === "servito" ||
    rawStatus === "queued"
      ? rawStatus
      : "in_attesa";
  return { courseNum: current, status };
}

const TABS = [
  { id: "comande", label: "Comande" },
  { id: "ricette", label: "Ricette cocktail" },
  { id: "note", label: "Note vocali" },
] as const;

/* ------------------------------------------------------------------ */
/*  Order card                                                         */
/* ------------------------------------------------------------------ */

function BarOrderCard({
  order,
  kds,
  onInPrep,
  onPronto,
  onServito,
}: {
  order: Order;
  kds: AreaKdsState;
  onInPrep: () => void;
  onPronto: () => void;
  onServito: () => void;
}) {
  const elapsed = minutesSince(order.createdAt);
  const barItems = order.items.filter(
    (i) => i.area === "bar" && i.course === kds.courseNum,
  );

  return (
    <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-rw-accent/15 px-2 py-0.5 text-xs font-bold text-rw-accent">
            T{order.table ?? "?"}
          </span>
          <span className="text-xs text-rw-muted">{order.waiter}</span>
          <span className="text-xs text-rw-muted">P{kds.courseNum}</span>
        </div>
        <span className={`text-xs font-semibold ${elapsed > 15 ? "text-red-400" : "text-rw-muted"}`}>
          {elapsed}′
        </span>
      </div>

      {order.notes ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 italic">
          {order.notes}
        </p>
      ) : null}

      <ul className="space-y-0.5">
        {barItems.map((it) => (
          <li key={it.id} className="flex items-center justify-between text-sm text-rw-soft">
            <span>
              <span className="font-medium text-rw-ink">{it.qty}×</span> {it.name}
            </span>
            {it.note && <span className="text-xs text-rw-muted italic">{it.note}</span>}
          </li>
        ))}
        {barItems.length === 0 && (
          <li className="text-xs text-rw-muted italic">Nessun item bar in questa portata</li>
        )}
      </ul>

      <div className="flex items-center gap-2 pt-1">
        {kds.status === "in_attesa" || kds.status === "queued" ? (
          <button
            type="button"
            onClick={onInPrep}
            className="flex-1 rounded-lg bg-rw-accent/15 px-3 py-1.5 text-xs font-bold text-rw-accent hover:bg-rw-accent/25 transition"
          >
            In prep
          </button>
        ) : kds.status === "in_preparazione" ? (
          <button
            type="button"
            onClick={onPronto}
            className="flex-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition"
          >
            Pronto
          </button>
        ) : kds.status === "pronto" ? (
          <button
            type="button"
            onClick={onServito}
            className="flex-1 rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/25 transition"
          >
            Servito
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

function NoteVocaliTab() {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [text, setText] = useState("");

  function save() {
    if (!text.trim()) return;
    setNotes((prev) => [...prev, { id: `vn-${Date.now()}`, text, createdAt: new Date().toLocaleString("it-IT") }]);
    setText("");
  }

  return (
    <div className="space-y-6">
      <Card title="Nuova nota" headerRight={<Mic className="h-5 w-5 text-rw-accent" />}>
        <div className="space-y-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi una nota…" rows={4} className="w-full rounded-xl border border-rw-line bg-rw-bg px-4 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent" />
          <div className="flex gap-3">
            <button type="button" onClick={save} className="rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rw-accent/85">Salva</button>
            <button type="button" onClick={() => setText("")} className="rounded-xl border border-rw-line px-5 py-2.5 text-sm font-semibold text-rw-muted transition hover:text-rw-ink">Cancella</button>
          </div>
        </div>
      </Card>

      {notes.length > 0 && (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
              <p className="text-sm text-rw-soft">{n.text}</p>
              <p className="mt-1 text-xs text-rw-muted">{n.createdAt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

function classifyByAreaState(orders: Order[], area: string) {
  const inAttesa: { order: Order; kds: AreaKdsState }[] = [];
  const inPrep: { order: Order; kds: AreaKdsState }[] = [];
  const pronti: { order: Order; kds: AreaKdsState }[] = [];

  for (const order of orders) {
    const kds = getAreaDisplayState(order, area);
    if (!kds) continue;
    if (kds.status === "in_attesa" || kds.status === "queued") {
      inAttesa.push({ order, kds });
    } else if (kds.status === "in_preparazione") {
      inPrep.push({ order, kds });
    } else if (kds.status === "pronto") {
      pronti.push({ order, kds });
    }
  }

  return { inAttesa, inPrep, pronti };
}

export function BarPage() {
  const { getOrdersForArea, patchStatus } = useOrders();
  const [activeTab, setActiveTab] = useState("comande");

  const barOrders = getOrdersForArea("bar");
  const classified = useMemo(() => classifyByAreaState(barOrders, "bar"), [barOrders]);

  const lateCount = barOrders.filter((o) => minutesSince(o.createdAt) > 15).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Bar" subtitle="Gestione bevande e cocktail">
        <Chip label="Ordini" value={barOrders.length} tone="info" />
        <Chip label="In prep" value={classified.inPrep.length} tone="accent" />
        <Chip label="Pronti" value={classified.pronti.length} tone="success" />
        <Chip label="In ritardo" value={lateCount} tone={lateCount > 0 ? "danger" : "default"} />
      </PageHeader>

      <TabBar tabs={[...TABS]} active={activeTab} onChange={setActiveTab} />

      {activeTab === "comande" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <KdsColumn title="In attesa" tone="pending" count={classified.inAttesa.length}>
            {classified.inAttesa.map(({ order, kds }) => (
              <BarOrderCard
                key={`${order.id}-${kds.courseNum}`}
                order={order}
                kds={kds}
                onInPrep={() => void patchStatus(order.id, "in_preparazione")}
                onPronto={() => void patchStatus(order.id, "pronto")}
                onServito={() => void patchStatus(order.id, "servito")}
              />
            ))}
            {classified.inAttesa.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">Nessuna comanda in attesa</p>}
          </KdsColumn>

          <KdsColumn title="In preparazione" tone="prep" count={classified.inPrep.length}>
            {classified.inPrep.map(({ order, kds }) => (
              <BarOrderCard
                key={`${order.id}-${kds.courseNum}`}
                order={order}
                kds={kds}
                onInPrep={() => void patchStatus(order.id, "in_preparazione")}
                onPronto={() => void patchStatus(order.id, "pronto")}
                onServito={() => void patchStatus(order.id, "servito")}
              />
            ))}
            {classified.inPrep.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">Nessuna comanda in prep</p>}
          </KdsColumn>

          <KdsColumn title="Pronti" tone="ready" count={classified.pronti.length}>
            {classified.pronti.map(({ order, kds }) => (
              <BarOrderCard
                key={`${order.id}-${kds.courseNum}`}
                order={order}
                kds={kds}
                onInPrep={() => void patchStatus(order.id, "in_preparazione")}
                onPronto={() => void patchStatus(order.id, "pronto")}
                onServito={() => void patchStatus(order.id, "servito")}
              />
            ))}
            {classified.pronti.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">Nessuna comanda pronta</p>}
          </KdsColumn>
        </div>
      )}

      {activeTab === "ricette" && (
        <RecipesTab
          area="bar"
          title="Ricette cocktail"
          description="Ricette cocktail persistenti sul DB tenant."
        />
      )}
      {activeTab === "note" && <NoteVocaliTab />}
    </div>
  );
}
