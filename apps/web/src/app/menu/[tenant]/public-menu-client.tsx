"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import type { PublicMenuItem } from "@/lib/db/repositories/public-menu.repository";

type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  qty: number;
};

function groupByMenuCategory(items: PublicMenuItem[]): Map<string, PublicMenuItem[]> {
  const m = new Map<string, PublicMenuItem[]>();
  for (const it of items) {
    const key = it.menuCategory || "Altro";
    const list = m.get(key) ?? [];
    list.push(it);
    m.set(key, list);
  }
  return m;
}

function MenuSection({
  title,
  subtitle,
  items,
  onAdd,
  qtyFor,
  onDelta,
}: {
  title: string;
  subtitle: string;
  items: PublicMenuItem[];
  onAdd: (item: PublicMenuItem) => void;
  qtyFor: (id: string) => number;
  onDelta: (item: PublicMenuItem, delta: number) => void;
}) {
  if (items.length === 0) return null;
  const byCat = [...groupByMenuCategory(items).entries()].sort(([a], [b]) => a.localeCompare(b, "it"));

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-rw-ink">{title}</h2>
        <p className="mt-1 text-sm text-rw-muted">{subtitle}</p>
      </div>
      {byCat.map(([category, list]) => (
        <div key={category}>
          <h3 className="mb-3 border-b border-rw-line pb-2 text-sm font-semibold uppercase tracking-wide text-rw-soft">
            {category}
          </h3>
          <ul className="space-y-4">
            {list.map((dish) => {
              const q = qtyFor(dish.id);
              return (
                <li
                  key={dish.id}
                  className="rounded-xl border border-rw-line bg-rw-surfaceAlt/60 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-rw-ink">{dish.name}</p>
                      {dish.description ? (
                        <p className="mt-1 text-sm text-rw-soft whitespace-pre-wrap">{dish.description}</p>
                      ) : null}
                      <p className="mt-2 font-display text-lg font-semibold text-rw-accent">
                        €{dish.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-44">
                      {q === 0 ? (
                        <button
                          type="button"
                          onClick={() => onAdd(dish)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]"
                        >
                          <Plus className="h-4 w-4" />
                          Aggiungi
                        </button>
                      ) : (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-rw-line bg-rw-surface px-2 py-1.5">
                          <button
                            type="button"
                            aria-label="Diminuisci quantità"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rw-line text-rw-ink transition hover:border-rw-accent/40"
                            onClick={() => onDelta(dish, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold text-rw-ink">{q}</span>
                          <button
                            type="button"
                            aria-label="Aumenta quantità"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rw-line text-rw-ink transition hover:border-rw-accent/40"
                            onClick={() => onDelta(dish, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function PublicMenuClient({
  tenantName,
  tenantSlug,
  items,
  tableId = null,
  tableLabel = null,
}: {
  tenantName: string;
  tenantSlug: string;
  items: PublicMenuItem[];
  /** Id riga tavolo (QR); se assente, ordine senza tavolo collegato. */
  tableId?: string | null;
  /** Nome tavolo mostrato in pagina (es. T1). */
  tableLabel?: string | null;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  const qtyById = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of cart) m.set(l.menuItemId, l.qty);
    return m;
  }, [cart]);

  function qtyFor(id: string) {
    return qtyById.get(id) ?? 0;
  }

  function addItem(dish: PublicMenuItem) {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.menuItemId === dish.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { menuItemId: dish.id, name: dish.name, unitPrice: dish.price, qty: 1 }];
    });
  }

  function deltaQty(dish: PublicMenuItem, delta: number) {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.menuItemId === dish.id);
      if (i < 0) return prev;
      const next = [...prev];
      const q = next[i].qty + delta;
      if (q <= 0) return prev.filter((_, j) => j !== i);
      next[i] = { ...next[i], qty: q };
      return next;
    });
  }

  function setLineQty(menuItemId: string, qty: number) {
    const n = Math.floor(Number(qty));
    setCart((prev) => {
      const i = prev.findIndex((l) => l.menuItemId === menuItemId);
      if (i < 0) return prev;
      if (!Number.isFinite(n) || n <= 0) return prev.filter((_, j) => j !== i);
      const next = [...prev];
      next[i] = { ...next[i], qty: n };
      return next;
    });
  }

  function removeLine(menuItemId: string) {
    setCart((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
  }

  async function submitOrder(payOnline: boolean) {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "public_menu",
          tenantSlug,
          payOnline,
          items: cart.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty })),
          ...(tableId?.trim() ? { tableId: tableId.trim() } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        stripeCheckoutUrl?: string;
      };
      if (!res.ok) {
        setSubmitError(data.error || `Errore ${res.status}`);
        return;
      }
      if (payOnline && typeof data.stripeCheckoutUrl === "string" && data.stripeCheckoutUrl.length > 0) {
        window.location.assign(data.stripeCheckoutUrl);
        return;
      }
      setCart([]);
      setSubmitOk(true);
    } catch {
      setSubmitError("Connessione non riuscita. Riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  const total = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.qty, 0), [cart]);
  const food = items.filter((i) => i.kind === "food");
  const drink = items.filter((i) => i.kind === "drink");

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-40">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-rw-muted">Menu</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-rw-ink">{tenantName}</h1>
        {tableLabel?.trim() ? (
          <p className="mt-3 inline-flex rounded-full border border-rw-accent/40 bg-rw-accent/10 px-4 py-1.5 text-sm font-semibold text-rw-accent">
            Tavolo {tableLabel.trim()}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-rw-muted">
          Aggiungi piatti al carrello. Puoi pagare online con carta (Stripe) o inviare la comanda senza pagamento e
          saldare in sala.
        </p>
      </header>

      <MenuSection
        title="Cibo"
        subtitle="Piatti e portate (categorie come da menu admin: Pizze, Primi, …)."
        items={food}
        onAdd={addItem}
        qtyFor={qtyFor}
        onDelta={deltaQty}
      />

      <MenuSection title="Bevande" subtitle="Bevande e categorie assimilate." items={drink} onAdd={addItem} qtyFor={qtyFor} onDelta={deltaQty} />

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-rw-line bg-rw-surface px-6 py-10 text-center text-sm text-rw-muted">
          Non ci sono piatti attivi nel menu. Aggiungili da Menu admin nel gestionale.
        </p>
      ) : null}

      {cart.length > 0 ? (
        <section className="rounded-2xl border border-rw-line bg-rw-surface p-5 shadow-rw-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-rw-accent" aria-hidden />
            <h2 className="font-display text-lg font-semibold text-rw-ink">Il tuo carrello</h2>
          </div>
          <ul className="space-y-3">
            {cart.map((line) => (
              <li
                key={line.menuItemId}
                className="flex flex-col gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-rw-ink">{line.name}</p>
                  <p className="text-xs text-rw-muted">
                    €{line.unitPrice.toFixed(2)} cad. · riga €{(line.unitPrice * line.qty).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-xl border border-rw-line bg-rw-surface px-1">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rw-ink hover:bg-rw-surfaceAlt"
                      aria-label="Meno"
                      onClick={() => setLineQty(line.menuItemId, line.qty - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      className="w-12 border-0 bg-transparent py-1 text-center text-sm font-semibold text-rw-ink focus:outline-none focus:ring-0"
                      value={line.qty}
                      onChange={(e) => setLineQty(line.menuItemId, Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rw-ink hover:bg-rw-surfaceAlt"
                      aria-label="Più"
                      onClick={() => setLineQty(line.menuItemId, line.qty + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.menuItemId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Rimuovi
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-rw-line pt-4">
            <span className="text-sm font-semibold text-rw-muted">Totale ordine</span>
            <span className="font-display text-2xl font-semibold text-rw-accent">€{total.toFixed(2)}</span>
          </div>
          {submitError ? (
            <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {submitError}
            </p>
          ) : null}
          {submitOk ? (
            <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              Ordine inviato. Lo staff lo riceverà a breve.
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void submitOrder(true)}
              disabled={submitting}
              className="w-full rounded-xl bg-rw-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-rw-accent/90 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99] sm:flex-1"
            >
              {submitting ? "Reindirizzamento…" : "Paga con carta e invia"}
            </button>
            <button
              type="button"
              onClick={() => void submitOrder(false)}
              disabled={submitting}
              className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/40 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99] sm:flex-1"
            >
              {submitting ? "Invio…" : "Invia senza pagare"}
            </button>
          </div>
        </section>
      ) : null}

      {cart.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rw-line bg-rw-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">Totale</p>
              <p className="font-display text-xl font-semibold text-rw-accent">€{total.toFixed(2)}</p>
            </div>
            <button
              type="button"
              onClick={() => void submitOrder(true)}
              disabled={submitting}
              className="shrink-0 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 disabled:opacity-60"
            >
              {submitting ? "…" : "Paga"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
