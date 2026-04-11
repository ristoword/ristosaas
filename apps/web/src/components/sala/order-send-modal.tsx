"use client";

import { useState } from "react";
import { Minus, Plus, Send, Trash2 } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { useOrders } from "@/components/orders/orders-context";
import type { SalaTable } from "./types";
import type { CourseDraft, OrderArea } from "@/components/orders/types";

const menuItems = [
  { name: "Bruschetta mista", category: "antipasti", area: "cucina" as OrderArea, price: 8 },
  { name: "Supplì al telefono", category: "antipasti", area: "cucina" as OrderArea, price: 3 },
  { name: "Tagliere toscano", category: "antipasti", area: "cucina" as OrderArea, price: 14 },
  { name: "Caprese", category: "antipasti", area: "cucina" as OrderArea, price: 9 },
  { name: "Carbonara", category: "primi", area: "cucina" as OrderArea, price: 12 },
  { name: "Amatriciana", category: "primi", area: "cucina" as OrderArea, price: 11 },
  { name: "Cacio e pepe", category: "primi", area: "cucina" as OrderArea, price: 11 },
  { name: "Risotto ai funghi", category: "primi", area: "cucina" as OrderArea, price: 13 },
  { name: "Tagliata", category: "secondi", area: "cucina" as OrderArea, price: 18 },
  { name: "Griglia mista", category: "secondi", area: "cucina" as OrderArea, price: 22 },
  { name: "Margherita", category: "pizze", area: "pizzeria" as OrderArea, price: 8 },
  { name: "Diavola", category: "pizze", area: "pizzeria" as OrderArea, price: 10 },
  { name: "Quattro formaggi", category: "pizze", area: "pizzeria" as OrderArea, price: 11 },
  { name: "Negroni", category: "cocktail", area: "bar" as OrderArea, price: 9 },
  { name: "Aperol Spritz", category: "cocktail", area: "bar" as OrderArea, price: 7 },
  { name: "Birra media", category: "bevande", area: "bar" as OrderArea, price: 5 },
  { name: "Tiramisù", category: "dolci", area: "cucina" as OrderArea, price: 7 },
];

type Props = {
  table: SalaTable | null;
  open: boolean;
  onClose: () => void;
};

export function OrderSendModal({ table, open, onClose }: Props) {
  const { createOrder } = useOrders();
  const [courses, setCourses] = useState<CourseDraft[]>([{ n: 1, items: [] }]);
  const [activeCourse, setActiveCourse] = useState(1);
  const [covers, setCovers] = useState(2);
  const [waiter, setWaiter] = useState("Marco");
  const [notes, setNotes] = useState("");

  if (!table) return null;

  function addCourse() {
    const next = courses.length + 1;
    setCourses((p) => [...p, { n: next, items: [] }]);
    setActiveCourse(next);
  }

  function addItem(item: (typeof menuItems)[0]) {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.n !== activeCourse) return c;
        const existing = c.items.find((i) => i.name === item.name);
        if (existing) {
          return { ...c, items: c.items.map((i) => (i.name === item.name ? { ...i, qty: i.qty + 1 } : i)) };
        }
        return { ...c, items: [...c.items, { ...item, qty: 1, note: null }] };
      }),
    );
  }

  function removeItem(courseN: number, name: string) {
    setCourses((prev) =>
      prev.map((c) => (c.n === courseN ? { ...c, items: c.items.filter((i) => i.name !== name) } : c)),
    );
  }

  function updateQty(courseN: number, name: string, delta: number) {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.n !== courseN) return c;
        return {
          ...c,
          items: c.items
            .map((i) => (i.name === name ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
            .filter((i) => i.qty > 0),
        };
      }),
    );
  }

  function handleSend() {
    const allItems = courses.flatMap((c) =>
      c.items.map((it, idx) => ({
        id: `new-${c.n}-${idx}`,
        name: it.name,
        qty: it.qty,
        category: it.category,
        area: it.area,
        price: it.price,
        note: it.note,
        course: c.n,
      })),
    );
    if (allItems.length === 0) return;

    createOrder({
      table: table!.nome,
      covers,
      area: "sala",
      waiter,
      notes,
      items: allItems,
    });

    setCourses([{ n: 1, items: [] }]);
    setActiveCourse(1);
    setNotes("");
    onClose();
  }

  const totalItems = courses.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.qty, 0), 0);

  return (
    <Modal open={open} onClose={onClose} title={`Nuova comanda — Tav. ${table.nome}`} subtitle={`${covers} coperti · ${waiter}`} wide>
      <div className="space-y-4">
        {/* Covers + waiter */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-rw-muted">Coperti</label>
            <div className="mt-1 flex items-center gap-2">
              <button type="button" onClick={() => setCovers((n) => Math.max(1, n - 1))} className="h-10 w-10 rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink">
                <Minus className="mx-auto h-4 w-4" />
              </button>
              <span className="w-8 text-center font-bold text-rw-ink">{covers}</span>
              <button type="button" onClick={() => setCovers((n) => n + 1)} className="h-10 w-10 rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink">
                <Plus className="mx-auto h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-rw-muted">Cameriere</label>
            <input
              value={waiter}
              onChange={(e) => setWaiter(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 text-sm text-rw-ink"
            />
          </div>
        </div>

        {/* Course tabs */}
        <div className="flex items-center gap-2">
          {courses.map((c) => (
            <button
              key={c.n}
              type="button"
              onClick={() => setActiveCourse(c.n)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeCourse === c.n
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
              }`}
            >
              {c.n}° corso
              {c.items.length > 0 && <span className="ml-1 opacity-70">({c.items.length})</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={addCourse}
            className="rounded-xl border border-dashed border-rw-line px-3 py-2 text-sm text-rw-muted hover:border-rw-accent/40 hover:text-rw-accent"
          >
            <Plus className="inline h-4 w-4 mr-1" />
            Corso
          </button>
        </div>

        {/* Menu items */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted mb-2">
            Aggiungi al {activeCourse}° corso
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 max-h-48 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => addItem(item)}
                className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-left text-xs transition hover:border-rw-accent/30"
              >
                <span className="block font-semibold text-rw-ink">{item.name}</span>
                <span className="text-rw-muted">€{item.price} · {item.area}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Course contents */}
        {courses.map((c) => {
          if (c.items.length === 0) return null;
          return (
            <div key={c.n} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
              <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${c.n === 1 ? "text-emerald-400" : "text-red-400"}`}>
                {c.n}° corso — {c.n === 1 ? "ATTIVO" : "IN ATTESA"}
              </p>
              <div className="space-y-1">
                {c.items.map((it) => (
                  <div key={it.name} className="flex items-center justify-between rounded-lg bg-rw-surface px-3 py-2">
                    <div>
                      <span className="text-sm font-semibold text-rw-ink">{it.name}</span>
                      <span className="ml-2 text-xs text-rw-muted">€{it.price}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateQty(c.n, it.name, -1)} className="h-7 w-7 rounded-lg border border-rw-line text-rw-ink text-xs">−</button>
                      <span className="w-6 text-center text-sm font-bold text-rw-ink">{it.qty}</span>
                      <button type="button" onClick={() => updateQty(c.n, it.name, 1)} className="h-7 w-7 rounded-lg border border-rw-line text-rw-ink text-xs">+</button>
                      <button type="button" onClick={() => removeItem(c.n, it.name)} className="ml-1 h-7 w-7 rounded-lg border border-red-500/30 text-red-400 text-xs">
                        <Trash2 className="mx-auto h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Notes */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note comanda (allergie, preferenze…)"
          rows={2}
          className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-ink placeholder:text-rw-muted"
        />

        {/* Send */}
        <button
          type="button"
          onClick={handleSend}
          disabled={totalItems === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 py-4 text-base font-bold text-emerald-300 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
          Invia comanda ({totalItems} piatti, {courses.length} {courses.length === 1 ? "corso" : "corsi"})
        </button>
      </div>
    </Modal>
  );
}
