"use client";

import { useMemo, useState } from "react";
import { Mic } from "lucide-react";
import { useOrders } from "@/components/orders/orders-context";
import type { Order } from "@/components/orders/types";
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

const TABS = [
  { id: "comande", label: "Comande" },
  { id: "ricette", label: "Ricette cocktail" },
  { id: "note", label: "Note vocali" },
] as const;

/* ------------------------------------------------------------------ */
/*  Order card (simplified – no course logic)                          */
/* ------------------------------------------------------------------ */

function BarOrderCard({
  order,
  onAction,
  actionLabel,
  actionTone,
}: {
  order: Order;
  onAction: () => void;
  actionLabel: string;
  actionTone: string;
}) {
  const elapsed = minutesSince(order.createdAt);
  const barItems = order.items.filter((i) => i.area === "bar");

  return (
    <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-rw-accent/15 px-2 py-0.5 text-xs font-bold text-rw-accent">
            T{order.table ?? "?"}
          </span>
          <span className="text-xs text-rw-muted">{order.waiter}</span>
        </div>
        <span className={`text-xs font-semibold ${elapsed > 15 ? "text-red-400" : "text-rw-muted"}`}>
          {elapsed}′
        </span>
      </div>

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
          <li className="text-xs text-rw-muted italic">Nessun item bar</li>
        )}
      </ul>

      <button
        type="button"
        onClick={onAction}
        className={`w-full rounded-lg px-3 py-1.5 text-xs font-bold transition ${actionTone}`}
      >
        {actionLabel}
      </button>
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

function classifyByStatus(orders: Order[]) {
  const inAttesa: Order[] = [];
  const inPrep: Order[] = [];
  const pronti: Order[] = [];

  for (const o of orders) {
    if (o.status === "in_attesa") inAttesa.push(o);
    else if (o.status === "in_preparazione") inPrep.push(o);
    else if (o.status === "pronto") pronti.push(o);
  }

  return { inAttesa, inPrep, pronti };
}

export function BarPage() {
  const { getOrdersForArea, patchStatus } = useOrders();
  const [activeTab, setActiveTab] = useState("comande");

  const barOrders = getOrdersForArea("bar");
  const classified = useMemo(() => classifyByStatus(barOrders), [barOrders]);

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
            {classified.inAttesa.map((order) => (
              <BarOrderCard
                key={order.id}
                order={order}
                onAction={() => patchStatus(order.id, "in_preparazione")}
                actionLabel="In prep"
                actionTone="bg-rw-accent/15 text-rw-accent hover:bg-rw-accent/25"
              />
            ))}
            {classified.inAttesa.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">Nessuna comanda in attesa</p>}
          </KdsColumn>

          <KdsColumn title="In preparazione" tone="prep" count={classified.inPrep.length}>
            {classified.inPrep.map((order) => (
              <BarOrderCard
                key={order.id}
                order={order}
                onAction={() => patchStatus(order.id, "pronto")}
                actionLabel="Pronto"
                actionTone="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
              />
            ))}
            {classified.inPrep.length === 0 && <p className="py-6 text-center text-xs text-rw-muted">Nessuna comanda in prep</p>}
          </KdsColumn>

          <KdsColumn title="Pronti" tone="ready" count={classified.pronti.length}>
            {classified.pronti.map((order) => (
              <BarOrderCard
                key={order.id}
                order={order}
                onAction={() => patchStatus(order.id, "servito")}
                actionLabel="Servito"
                actionTone="bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
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
