"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Clock,
  Package,
  Phone,
  Plus,
  ShoppingBag,
  Truck,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { asportoApi, type AsportoOrder } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { KdsColumn } from "@/components/shared/kds-column";

type AsportoStatus = AsportoOrder["status"];

const STATUS_FLOW: Record<AsportoStatus, AsportoStatus | null> = {
  nuovo: "in_preparazione",
  in_preparazione: "pronto",
  pronto: "ritirato",
  ritirato: null,
  consegnato: null,
  annullato: null,
};

const STATUS_LABELS: Record<AsportoStatus, string> = {
  nuovo: "Nuovo",
  in_preparazione: "In preparazione",
  pronto: "Pronto",
  ritirato: "Ritirato",
  consegnato: "Consegnato",
  annullato: "Annullato",
};

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

function OrderCard({
  order,
  onAdvance,
  onCancel,
}: {
  order: AsportoOrder;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const nextStatus = STATUS_FLOW[order.status];

  return (
    <div className="rounded-xl border border-rw-line bg-rw-surface p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-rw-accent">#{order.id.slice(0, 6)}</span>
        <span className="text-xs text-rw-muted flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {order.pickupTime}
        </span>
      </div>
      <p className="text-sm font-semibold text-rw-ink">{order.customerName}</p>
      <div className="space-y-0.5">
        {order.items.map((item, i) => (
          <p key={i} className="text-xs text-rw-soft">
            {item.qty}× {item.name} — €{item.price.toFixed(2)}
          </p>
        ))}
      </div>
      {order.type === "delivery" && order.address && (
        <p className="text-xs text-rw-muted flex items-center gap-1">
          <Truck className="h-3 w-3" /> {order.address}
        </p>
      )}
      {order.notes && (
        <p className="text-xs italic text-rw-muted">{order.notes}</p>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-rw-line/50">
        <span className="text-xs text-rw-muted flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {order.phone}
        </span>
        <span className="text-sm font-bold text-rw-ink">€{order.total.toFixed(2)}</span>
      </div>
      {(nextStatus || order.status === "nuovo") && (
        <div className="flex gap-2 pt-1">
          {nextStatus && (
            <button
              type="button"
              onClick={onAdvance}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-rw-accent/15 px-2 py-1.5 text-[11px] font-semibold text-rw-accent hover:bg-rw-accent/25 transition"
            >
              <ArrowRight className="h-3 w-3" />
              {STATUS_LABELS[nextStatus]}
            </button>
          )}
          {order.status !== "annullato" && order.status !== "ritirato" && order.status !== "consegnato" && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AsportoPage() {
  const [orders, setOrders] = useState<AsportoOrder[]>([]);
  const [loading, setLoading] = useState(true);

  /* form state */
  const [fCustomer, setFCustomer] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fPickup, setFPickup] = useState("20:00");
  const [fNotes, setFNotes] = useState("");
  const [fType, setFType] = useState<"asporto" | "delivery">("asporto");
  const [fAddress, setFAddress] = useState("");
  const [fItems, setFItems] = useState([{ name: "", qty: 1, price: 0 }]);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await asportoApi.list();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch asporto orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function advanceStatus(order: AsportoOrder) {
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    try {
      const updated = await asportoApi.update(order.id, { status: next });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  }

  async function cancelOrder(order: AsportoOrder) {
    try {
      const updated = await asportoApi.update(order.id, { status: "annullato" });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (err) {
      console.error("Failed to cancel order:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fCustomer.trim()) return;
    const validItems = fItems.filter((it) => it.name.trim());
    if (validItems.length === 0) return;
    try {
      const created = await asportoApi.create({
        customerName: fCustomer.trim(),
        phone: fPhone.trim(),
        pickupTime: fPickup,
        notes: fNotes.trim(),
        type: fType,
        address: fType === "delivery" ? fAddress.trim() : "",
        items: validItems,
        total: validItems.reduce((s, it) => s + it.qty * it.price, 0),
        status: "nuovo",
        createdAt: new Date().toISOString(),
      });
      setOrders((prev) => [...prev, created]);
      setFCustomer(""); setFPhone(""); setFPickup("20:00"); setFNotes("");
      setFType("asporto"); setFAddress("");
      setFItems([{ name: "", qty: 1, price: 0 }]);
    } catch (err) {
      console.error("Failed to create order:", err);
    }
  }

  const nuovi = orders.filter((o) => o.status === "nuovo");
  const inPrep = orders.filter((o) => o.status === "in_preparazione");
  const pronti = orders.filter((o) => o.status === "pronto");
  const completati = orders.filter((o) => o.status === "ritirato" || o.status === "consegnato");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-rw-muted">Caricamento ordini…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Asporto" subtitle="Gestione ordini da asporto e delivery" />

      <div className="flex flex-wrap gap-3">
        <Chip label="Nuovi" value={nuovi.length} tone="warn" />
        <Chip label="In preparazione" value={inPrep.length} tone="accent" />
        <Chip label="Pronti" value={pronti.length} tone="info" />
        <Chip label="Completati" value={completati.length} tone="success" />
      </div>

      <Card title="Nuovo ordine" headerRight={<ShoppingBag className="h-4 w-4 text-rw-accent" />}>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelCls}>Cliente</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input type="text" placeholder="Nome" className={cn(inputCls, "pl-9")} value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Telefono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input type="tel" placeholder="+39 ..." className={cn(inputCls, "pl-9")} value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Orario ritiro</label>
              <input type="time" className={inputCls} value={fPickup} onChange={(e) => setFPickup(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select className={inputCls} value={fType} onChange={(e) => setFType(e.target.value as "asporto" | "delivery")}>
                <option value="asporto">Asporto</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>

          {fType === "delivery" && (
            <div>
              <label className={labelCls}>Indirizzo consegna</label>
              <input type="text" placeholder="Via, civico, città" className={inputCls} value={fAddress} onChange={(e) => setFAddress(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <label className={labelCls}>Articoli</label>
            {fItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-end">
                <input
                  type="text"
                  placeholder="Nome prodotto"
                  className={inputCls}
                  value={item.name}
                  onChange={(e) => setFItems((prev) => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))}
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Qtà"
                  className={inputCls}
                  value={item.qty}
                  onChange={(e) => setFItems((prev) => prev.map((it, i) => i === idx ? { ...it, qty: parseInt(e.target.value) || 1 } : it))}
                />
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="€"
                  className={inputCls}
                  value={item.price || ""}
                  onChange={(e) => setFItems((prev) => prev.map((it, i) => i === idx ? { ...it, price: parseFloat(e.target.value) || 0 } : it))}
                />
                {fItems.length > 1 && (
                  <button type="button" onClick={() => setFItems((prev) => prev.filter((_, i) => i !== idx))} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFItems((prev) => [...prev, { name: "", qty: 1, price: 0 }])}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rw-accent hover:underline"
            >
              <Plus className="h-3 w-3" /> Aggiungi articolo
            </button>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Note</label>
            <input type="text" placeholder="Allergie, richieste..." className={inputCls} value={fNotes} onChange={(e) => setFNotes(e.target.value)} />
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-sm font-semibold text-rw-ink">
              Totale: €{fItems.reduce((s, it) => s + it.qty * it.price, 0).toFixed(2)}
            </p>
            <button type="submit" className={btnPrimary}>
              <Plus className="h-4 w-4" /> Aggiungi ordine
            </button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <KdsColumn title="Nuovi" tone="pending" count={nuovi.length}>
          {nuovi.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">Nessun ordine</p>}
          {nuovi.map((o) => (
            <OrderCard key={o.id} order={o} onAdvance={() => advanceStatus(o)} onCancel={() => cancelOrder(o)} />
          ))}
        </KdsColumn>
        <KdsColumn title="In preparazione" tone="prep" count={inPrep.length}>
          {inPrep.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">Nessun ordine</p>}
          {inPrep.map((o) => (
            <OrderCard key={o.id} order={o} onAdvance={() => advanceStatus(o)} onCancel={() => cancelOrder(o)} />
          ))}
        </KdsColumn>
        <KdsColumn title="Pronti / Completati" tone="ready" count={pronti.length + completati.length}>
          {pronti.length === 0 && completati.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">Nessun ordine</p>}
          {pronti.map((o) => (
            <OrderCard key={o.id} order={o} onAdvance={() => advanceStatus(o)} onCancel={() => cancelOrder(o)} />
          ))}
          {completati.map((o) => (
            <OrderCard key={o.id} order={o} onAdvance={() => advanceStatus(o)} onCancel={() => cancelOrder(o)} />
          ))}
        </KdsColumn>
      </div>
    </div>
  );
}
