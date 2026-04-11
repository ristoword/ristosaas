"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Package,
  Phone,
  Plus,
  ShoppingBag,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { KdsColumn } from "@/components/shared/kds-column";

type TakeawayStatus = "nuovo" | "in-preparazione" | "completato";

type TakeawayOrder = {
  id: string;
  customer: string;
  phone: string;
  pickupTime: string;
  people: number;
  notes: string;
  amount: number;
  status: TakeawayStatus;
  items: string;
};

const mockOrders: TakeawayOrder[] = [
  { id: "A01", customer: "Mario Bianchi", phone: "+39 345 1112233", pickupTime: "19:30", people: 2, notes: "Senza cipolla", amount: 45.0, items: "2× Margherita, 1× Tiramisù", status: "nuovo" },
  { id: "A02", customer: "Sara Conti", phone: "+39 320 4455667", pickupTime: "19:45", people: 1, notes: "", amount: 18.5, items: "1× Carbonara, 1× Acqua", status: "nuovo" },
  { id: "A03", customer: "Luca Ferrari", phone: "+39 338 7788990", pickupTime: "20:00", people: 3, notes: "Celiaco: tutto senza glutine", amount: 72.0, items: "3× Pizza GF, 1× Insalata, 2× Birra", status: "in-preparazione" },
  { id: "A04", customer: "Giulia Moretti", phone: "+39 347 1122334", pickupTime: "20:15", people: 4, notes: "", amount: 95.0, items: "4× Menu degustazione", status: "in-preparazione" },
  { id: "A05", customer: "Paolo Ricci", phone: "+39 333 5566778", pickupTime: "18:30", people: 1, notes: "Già pagato online", amount: 22.0, items: "1× Burger, 1× Patatine, 1× Cola", status: "completato" },
];

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

function OrderCard({ order }: { order: TakeawayOrder }) {
  return (
    <div className="rounded-xl border border-rw-line bg-rw-surface p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-rw-accent">#{order.id}</span>
        <span className="text-xs text-rw-muted flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {order.pickupTime}
        </span>
      </div>
      <p className="text-sm font-semibold text-rw-ink">{order.customer}</p>
      <p className="text-xs text-rw-soft">{order.items}</p>
      {order.notes && (
        <p className="text-xs italic text-rw-muted">{order.notes}</p>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-rw-line/50">
        <span className="text-xs text-rw-muted flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {order.phone}
        </span>
        <span className="text-sm font-bold text-rw-ink">€{order.amount.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function AsportoPage() {
  const [orders] = useState<TakeawayOrder[]>(mockOrders);

  const nuovi = orders.filter((o) => o.status === "nuovo");
  const inPrep = orders.filter((o) => o.status === "in-preparazione");
  const completati = orders.filter((o) => o.status === "completato");

  return (
    <div className="space-y-6">
      <PageHeader title="Asporto" subtitle="Gestione ordini da asporto" />

      <div className="flex flex-wrap gap-3">
        <Chip label="Nuovi" value={nuovi.length} tone="warn" />
        <Chip label="In preparazione" value={inPrep.length} tone="accent" />
        <Chip label="Completati" value={completati.length} tone="success" />
      </div>

      <Card title="Nuovo ordine" headerRight={<ShoppingBag className="h-4 w-4 text-rw-accent" />}>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className={labelCls}>Cliente</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input type="text" placeholder="Nome" className={cn(inputCls, "pl-9")} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Telefono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input type="tel" placeholder="+39 ..." className={cn(inputCls, "pl-9")} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Orario ritiro</label>
            <input type="time" className={inputCls} defaultValue="20:00" />
          </div>
          <div>
            <label className={labelCls}>Persone</label>
            <input type="number" min={1} defaultValue={1} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Note</label>
            <input type="text" placeholder="Allergie, richieste..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Importo (€)</label>
            <input type="number" step="0.01" min={0} placeholder="0.00" className={inputCls} />
          </div>
          <div className="flex items-end">
            <button type="submit" className={cn(btnPrimary, "w-full")}>
              <Plus className="h-4 w-4" />
              Aggiungi
            </button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <KdsColumn title="Nuovi" tone="pending" count={nuovi.length}>
          {nuovi.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">Nessun ordine</p>}
          {nuovi.map((o) => <OrderCard key={o.id} order={o} />)}
        </KdsColumn>
        <KdsColumn title="In preparazione" tone="prep" count={inPrep.length}>
          {inPrep.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">Nessun ordine</p>}
          {inPrep.map((o) => <OrderCard key={o.id} order={o} />)}
        </KdsColumn>
        <KdsColumn title="Completati" tone="ready" count={completati.length}>
          {completati.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">Nessun ordine</p>}
          {completati.map((o) => <OrderCard key={o.id} order={o} />)}
        </KdsColumn>
      </div>
    </div>
  );
}
