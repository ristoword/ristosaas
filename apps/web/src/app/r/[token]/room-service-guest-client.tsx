"use client";

import { useState } from "react";
import {
  BedDouble,
  Check,
  ChefHat,
  ClipboardList,
  Loader2,
  Minus,
  Plus,
  ShirtIcon,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────── */

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  unit: string;
};

type CartEntry = { item: CatalogItem; qty: number };

type Props = {
  token: string;
  tenantName: string;
  room: { code: string; type: string; floor: number };
  catalog: CatalogItem[];
};

/* ─── Category meta ──────────────────────────────── */

const CAT_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  food:          { label: "Ristorazione",   icon: ChefHat,      color: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  laundry:       { label: "Lavanderia",     icon: ShirtIcon,    color: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  minibar:       { label: "Minibar",        icon: ClipboardList, color: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
  shoe_cleaning: { label: "Pulizia scarpe", icon: BedDouble,    color: "bg-slate-500/15 text-slate-500 border-slate-500/30" },
  linen:         { label: "Biancheria",     icon: BedDouble,    color: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30" },
  amenities:     { label: "Amenities",      icon: ClipboardList, color: "bg-pink-500/15 text-pink-500 border-pink-500/30" },
  transport:     { label: "Trasporto",      icon: Truck,        color: "bg-green-500/15 text-green-500 border-green-500/30" },
  other:         { label: "Altro",          icon: ClipboardList, color: "bg-gray-500/15 text-gray-500 border-gray-500/30" },
};

const euro = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

/* ─── Component ──────────────────────────────────── */

export function RoomServiceGuestClient({ token, tenantName, room, catalog }: Props) {
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [guestName, setGuestName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [...new Set(catalog.map((c) => c.category))];

  const filtered = activeCategory === "all"
    ? catalog
    : catalog.filter((c) => c.category === activeCategory);

  const total = cart.reduce((s, e) => s + e.qty * e.item.unitPrice, 0);

  function getQty(id: string) {
    return cart.find((e) => e.item.id === id)?.qty ?? 0;
  }

  function setQty(item: CatalogItem, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((e) => e.item.id !== item.id));
    } else {
      setCart((prev) => {
        const ex = prev.find((e) => e.item.id === item.id);
        if (ex) return prev.map((e) => e.item.id === item.id ? { ...e, qty } : e);
        return [...prev, { item, qty }];
      });
    }
  }

  const dominantCategory = cart.length > 0
    ? cart.reduce<Record<string, number>>((acc, e) => {
        acc[e.item.category] = (acc[e.item.category] ?? 0) + e.qty;
        return acc;
      }, {})[
        Object.entries(
          cart.reduce<Record<string, number>>((acc, e) => {
            acc[e.item.category] = (acc[e.item.category] ?? 0) + e.qty;
            return acc;
          }, {})
        ).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "other"
      ] != null
        ? Object.entries(
            cart.reduce<Record<string, number>>((acc, e) => {
              acc[e.item.category] = (acc[e.item.category] ?? 0) + e.qty;
              return acc;
            }, {})
          ).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "other"
        : "other"
    : "other";

  async function handleSubmit() {
    if (cart.length === 0) { setError("Aggiungi almeno un servizio al carrello."); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/public/room-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          guestName: guestName.trim() || "Ospite",
          category: dominantCategory,
          items: cart.map((e) => ({ name: e.item.name, qty: e.qty, unitPrice: e.item.unitPrice })),
          notes: notes.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Errore invio");
      setSubmitted(true);
      setCart([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore di rete");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Richiesta inviata!</h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            Il personale di <strong>{tenantName}</strong> riceverà la tua richiesta per la camera <strong>{room.code}</strong> e la gestirà al più presto.
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            Nessun pagamento richiesto ora — il servizio verrà addebitato al tuo conto al momento del check-out.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-6 rounded-2xl bg-gray-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-gray-900 hover:opacity-90 transition"
          >
            Fai un altro ordine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-4 py-4">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{tenantName}</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Room Service — Camera {room.code}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Piano {room.floor} · {room.type}</p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
        {catalog.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500">Nessun servizio disponibile al momento.</p>
            <p className="text-xs text-gray-400 mt-1">Contatta la reception per assistenza.</p>
          </div>
        ) : (
          <>
            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                  activeCategory === "all"
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                    : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-500",
                )}
              >
                Tutti
              </button>
              {categories.map((cat) => {
                const meta = CAT_META[cat] ?? CAT_META.other;
                const Icon = meta.icon;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                      activeCategory === cat
                        ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                        : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-500",
                    )}
                  >
                    <Icon className="h-3 w-3" />{meta.label}
                  </button>
                );
              })}
            </div>

            {/* Catalog items */}
            <div className="space-y-3">
              {filtered.map((item) => {
                const meta = CAT_META[item.category] ?? CAT_META.other;
                const Icon = meta.icon;
                const qty = getQty(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", meta.color)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{euro(item.unitPrice)} / {item.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {qty > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setQty(item, qty - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-5 text-center text-sm font-bold text-gray-900 dark:text-gray-100">{qty}</span>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setQty(item, qty + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-85 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guest info + notes */}
            <div className="space-y-3">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Il tuo nome (opzionale)"
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note o richieste speciali (es. allergie, orario preferito)…"
                rows={2}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-none"
              />
            </div>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            {/* Order summary + submit */}
            {cart.length > 0 && (
              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Il tuo ordine</h3>
                {cart.map((e) => (
                  <div key={e.item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{e.qty}× {e.item.name}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{euro(e.qty * e.item.unitPrice)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex justify-between font-bold text-gray-900 dark:text-gray-100">
                  <span>Totale</span>
                  <span>{euro(total)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Verrà addebitato al tuo conto camera al momento del check-out.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || cart.length === 0}
              className="w-full rounded-2xl bg-gray-900 dark:bg-white px-6 py-4 text-sm font-bold text-white dark:text-gray-900 transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invio in corso…
                </span>
              ) : cart.length === 0 ? (
                "Seleziona almeno un servizio"
              ) : (
                `Invia richiesta — ${euro(total)}`
              )}
            </button>

            <p className="text-center text-xs text-gray-400 pb-4">
              Per emergenze o assistenza immediata chiama la reception.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
