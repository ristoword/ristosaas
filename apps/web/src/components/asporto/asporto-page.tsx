"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Truck,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { asportoApi, menuApi, type AsportoOrder, type MenuItem, type DailyDish } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { KdsColumn } from "@/components/shared/kds-column";
import { useI18n } from "@/core/i18n/provider";

type AsportoStatus = AsportoOrder["status"];

const POLL_INTERVAL = 5000;

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";

function getStatusFlow(type: "asporto" | "delivery"): Record<AsportoStatus, AsportoStatus | null> {
  return {
    nuovo: "in_preparazione",
    in_preparazione: "pronto",
    pronto: type === "delivery" ? "consegnato" : "ritirato",
    ritirato: null,
    consegnato: null,
    annullato: null,
  };
}

type MenuEntry = { name: string; price: number; category: string; source: string };

function OrderCard({
  order,
  onAdvance,
  onCancel,
  onPrint,
  t,
}: {
  order: AsportoOrder;
  onAdvance: () => void;
  onCancel: () => void;
  onPrint: () => void;
  t: (key: string) => string;
}) {
  const flow = getStatusFlow(order.type);
  const nextStatus = flow[order.status];
  const isActive = !["ritirato", "consegnato", "annullato"].includes(order.status);

  return (
    <div className={cn("rounded-xl border p-3 space-y-2", order.status === "annullato" ? "border-red-500/30 bg-red-500/5 opacity-60" : "border-rw-line bg-rw-surface")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-rw-accent">#{order.id.slice(0, 6)}</span>
          {order.type === "delivery" && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-400"><Truck className="h-3 w-3" />{t("asporto.delivery")}</span>}
          {order.type === "asporto" && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400"><ShoppingBag className="h-3 w-3" />{t("asporto.takeaway")}</span>}
        </div>
        <span className="text-xs text-rw-muted flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {order.pickupTime}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <User className="h-3.5 w-3.5 text-rw-muted" />
        <p className="text-sm font-semibold text-rw-ink">{order.customerName}</p>
      </div>

      <div className="space-y-0.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-rw-soft">{item.qty}x {item.name}</span>
            <span className="text-rw-muted">{"\u20AC"}{(item.qty * item.price).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {order.type === "delivery" && order.address && (
        <p className="text-xs text-rw-muted flex items-center gap-1"><MapPin className="h-3 w-3" /> {order.address}</p>
      )}
      {order.notes && <p className="text-xs italic text-rw-muted">{order.notes}</p>}

      <div className="flex items-center justify-between pt-1 border-t border-rw-line/50">
        <span className="text-xs text-rw-muted flex items-center gap-1"><Phone className="h-3 w-3" />{order.phone}</span>
        <span className="text-sm font-bold text-rw-ink">{"\u20AC"}{order.total.toFixed(2)}</span>
      </div>

      <div className="flex gap-2 pt-1">
        {nextStatus && (
          <button type="button" onClick={onAdvance} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-rw-accent/15 px-2 py-1.5 text-[11px] font-semibold text-rw-accent hover:bg-rw-accent/25 transition">
            <ArrowRight className="h-3 w-3" />
            {t(`asporto.status.${nextStatus}`)}
          </button>
        )}
        <button type="button" onClick={onPrint} className="inline-flex items-center justify-center rounded-lg border border-rw-line px-2 py-1.5 text-[11px] text-rw-muted hover:text-rw-ink transition">
          <Printer className="h-3 w-3" />
        </button>
        {isActive && (
          <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AsportoPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<AsportoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuEntry[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [fCustomer, setFCustomer] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fPickup, setFPickup] = useState("20:00");
  const [fNotes, setFNotes] = useState("");
  const [fType, setFType] = useState<"asporto" | "delivery">("asporto");
  const [fAddress, setFAddress] = useState("");
  const [fItems, setFItems] = useState<{ name: string; qty: number; price: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await asportoApi.list();
      setOrders(data);
    } catch { /* silent poll */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(fetchOrders, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchOrders]);

  useEffect(() => {
    Promise.all([menuApi.listItems(), menuApi.listDaily()]).then(([items, daily]) => {
      const entries: MenuEntry[] = [];
      for (const m of items) {
        if (m.active) entries.push({ name: m.name, price: m.price, category: m.category, source: t("asporto.menu_casa") });
      }
      for (const d of daily) {
        entries.push({ name: d.name, price: d.price, category: d.category, source: t("asporto.menu_giorno") });
      }
      setMenuItems(entries);
    }).catch(() => {});
  }, []);

  const filteredMenu = useMemo(() => {
    if (!menuSearch.trim()) return menuItems;
    const lc = menuSearch.toLowerCase();
    return menuItems.filter((m) => m.name.toLowerCase().includes(lc) || m.category.toLowerCase().includes(lc));
  }, [menuItems, menuSearch]);

  const menuByCategory = useMemo(() => {
    const map = new Map<string, MenuEntry[]>();
    for (const m of filteredMenu) {
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return map;
  }, [filteredMenu]);

  function addMenuItem(item: MenuEntry) {
    setFItems((prev) => {
      const existing = prev.find((i) => i.name === item.name && i.price === item.price);
      if (existing) return prev.map((i) => i === existing ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { name: item.name, qty: 1, price: item.price }];
    });
  }

  function addManualItem() {
    setFItems((prev) => [...prev, { name: "", qty: 1, price: 0 }]);
  }

  async function advanceStatus(order: AsportoOrder) {
    const flow = getStatusFlow(order.type);
    const next = flow[order.status];
    if (!next) return;
    try {
      const updated = await asportoApi.update(order.id, { status: next });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch { /* */ }
  }

  async function cancelOrder(order: AsportoOrder) {
    try {
      const updated = await asportoApi.update(order.id, { status: "annullato" });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch { /* */ }
  }

  function printTicket(order: AsportoOrder) {
    const w = window.open("", "_blank", "width=380,height=600");
    if (!w) return;
    const itemsHtml = order.items.map((i) => `<tr><td>${i.qty}x</td><td>${i.name}</td><td style="text-align:right">\u20AC${(i.qty * i.price).toFixed(2)}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Ticket #${order.id.slice(0, 6)}</title><style>body{font-family:monospace;font-size:12px;padding:10px;max-width:350px}h2{text-align:center;margin:0}hr{border:none;border-top:1px dashed #000}table{width:100%;border-collapse:collapse}td{padding:2px 4px}.total{font-size:16px;font-weight:bold;text-align:right}.info{color:#666;font-size:11px}</style></head><body>
    <h2>${order.type === "delivery" ? "DELIVERY" : "ASPORTO"}</h2>
    <p style="text-align:center">#${order.id.slice(0, 6)} — ${new Date(order.createdAt).toLocaleString("it-IT")}</p><hr>
    <p><strong>${order.customerName}</strong><br><span class="info">${order.phone}</span></p>
    ${order.type === "delivery" && order.address ? `<p class="info">${order.address}</p>` : ""}
    <p class="info">${t("asporto.pickupTime")}: ${order.pickupTime}</p><hr>
    <table>${itemsHtml}</table><hr>
    <p class="total">TOTALE: \u20AC${order.total.toFixed(2)}</p>
    ${order.notes ? `<hr><p class="info">${order.notes}</p>` : ""}
    <hr><p style="text-align:center;font-size:10px">Grazie e a presto!</p>
    </body></html>`);
    w.document.close();
    w.print();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fCustomer.trim()) return;
    const validItems = fItems.filter((it) => it.name.trim());
    if (validItems.length === 0) return;
    setSubmitting(true);
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
      setOrders((prev) => [created, ...prev]);
      setFCustomer(""); setFPhone(""); setFPickup("20:00"); setFNotes("");
      setFType("asporto"); setFAddress(""); setFItems([]); setShowForm(false);
    } catch { /* */ }
    finally { setSubmitting(false); }
  }

  const fTotal = fItems.reduce((s, it) => s + it.qty * it.price, 0);

  const nuovi = orders.filter((o) => o.status === "nuovo");
  const inPrep = orders.filter((o) => o.status === "in_preparazione");
  const pronti = orders.filter((o) => o.status === "pronto");
  const completati = orders.filter((o) => ["ritirato", "consegnato"].includes(o.status));
  const annullati = orders.filter((o) => o.status === "annullato");
  const todayRevenue = [...completati].reduce((s, o) => s + o.total, 0);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-rw-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("asporto.title")} subtitle={t("asporto.subtitle")}>
        <button type="button" onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rw-accent/90 transition">
          <Plus className="h-4 w-4" />
          {t("asporto.newOrder")}
        </button>
      </PageHeader>

      {/* KPIs */}
      <div className="flex flex-wrap gap-3">
        <Chip label={t("asporto.status.nuovo")} value={nuovi.length} tone="warn" />
        <Chip label={t("asporto.status.in_preparazione")} value={inPrep.length} tone="accent" />
        <Chip label={t("asporto.status.pronto")} value={pronti.length} tone="info" />
        <Chip label={t("asporto.completed")} value={completati.length} tone="success" />
        {annullati.length > 0 && <Chip label={t("asporto.status.annullato")} value={annullati.length} />}
        <Chip label={t("asporto.todayRevenue")} value={`\u20AC${todayRevenue.toFixed(2)}`} tone="success" />
      </div>

      {/* New Order Form */}
      {showForm && (
        <Card title={t("asporto.newOrder")} headerRight={<button onClick={() => setShowForm(false)} className="text-rw-muted hover:text-rw-ink"><X className="h-4 w-4" /></button>}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelCls}>{t("asporto.customer")}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                  <input type="text" placeholder={t("asporto.customer_placeholder")} className={cn(inputCls, "pl-9")} value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("asporto.phone")}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                  <input type="tel" placeholder="+39 ..." className={cn(inputCls, "pl-9")} value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("asporto.pickupTime")}</label>
                <input type="time" className={inputCls} value={fPickup} onChange={(e) => setFPickup(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t("asporto.type")}</label>
                <select className={inputCls} value={fType} onChange={(e) => setFType(e.target.value as "asporto" | "delivery")}>
                  <option value="asporto">{t("asporto.takeaway")}</option>
                  <option value="delivery">{t("asporto.delivery")}</option>
                </select>
              </div>
            </div>

            {fType === "delivery" && (
              <div>
                <label className={labelCls}>{t("asporto.address")}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                  <input type="text" placeholder={t("asporto.address_placeholder")} className={cn(inputCls, "pl-9")} value={fAddress} onChange={(e) => setFAddress(e.target.value)} />
                </div>
              </div>
            )}

            {/* Menu picker */}
            <div className="rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <label className={labelCls}>{t("asporto.selectFromMenu")}</label>
                <div className="relative w-48">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rw-muted" />
                  <input value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder={t("asporto.searchMenu")} className="w-full rounded-lg border border-rw-line bg-rw-bg py-1 pl-7 pr-2 text-xs text-rw-ink placeholder:text-rw-muted" />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {Array.from(menuByCategory.entries()).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-rw-muted">{cat}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {items.map((m, i) => (
                        <button key={i} type="button" onClick={() => addMenuItem(m)} className="inline-flex items-center gap-1 rounded-lg border border-rw-line bg-rw-surface px-2 py-1 text-xs text-rw-ink hover:border-rw-accent hover:bg-rw-accent/10 transition">
                          {m.name} <span className="text-rw-muted">{"\u20AC"}{m.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {menuItems.length === 0 && <p className="text-xs text-rw-muted py-2">{t("asporto.noMenuItems")}</p>}
              </div>
            </div>

            {/* Selected items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={labelCls}>{t("asporto.items")} ({fItems.length})</label>
                <button type="button" onClick={addManualItem} className="inline-flex items-center gap-1 text-xs font-semibold text-rw-accent hover:underline">
                  <Plus className="h-3 w-3" /> {t("asporto.addManual")}
                </button>
              </div>
              {fItems.length === 0 && <p className="text-xs text-rw-muted py-2">{t("asporto.noItems")}</p>}
              <div className="overflow-x-auto -mx-1 px-1">
                {fItems.map((item, idx) => (
                  <div key={idx} className="grid min-w-[360px] grid-cols-[1fr_70px_90px_auto] gap-2 items-end mb-2">
                    <input type="text" placeholder={t("asporto.itemName")} className={inputCls} value={item.name} onChange={(e) => setFItems((prev) => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))} />
                    <input type="number" min={1} placeholder={t("asporto.qty")} className={inputCls} value={item.qty} onChange={(e) => setFItems((prev) => prev.map((it, i) => i === idx ? { ...it, qty: parseInt(e.target.value) || 1 } : it))} />
                    <input type="number" step="0.01" min={0} placeholder={"\u20AC"} className={inputCls} value={item.price || ""} onChange={(e) => setFItems((prev) => prev.map((it, i) => i === idx ? { ...it, price: parseFloat(e.target.value) || 0 } : it))} />
                    <button type="button" onClick={() => setFItems((prev) => prev.filter((_, i) => i !== idx))} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>{t("asporto.notes")}</label>
              <input type="text" placeholder={t("asporto.notes_placeholder")} className={inputCls} value={fNotes} onChange={(e) => setFNotes(e.target.value)} />
            </div>

            <div className="flex items-center justify-between border-t border-rw-line/50 pt-3">
              <p className="text-sm font-semibold text-rw-ink">{t("asporto.total")}: {"\u20AC"}{fTotal.toFixed(2)}</p>
              <button type="submit" disabled={submitting || !fCustomer.trim() || fItems.filter((i) => i.name.trim()).length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t("asporto.createOrder")}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* KDS Columns */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KdsColumn title={t("asporto.status.nuovo")} tone="pending" count={nuovi.length}>
          {nuovi.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">{t("asporto.empty")}</p>}
          {nuovi.map((o) => <OrderCard key={o.id} order={o} onAdvance={() => advanceStatus(o)} onCancel={() => cancelOrder(o)} onPrint={() => printTicket(o)} t={t} />)}
        </KdsColumn>
        <KdsColumn title={t("asporto.status.in_preparazione")} tone="prep" count={inPrep.length}>
          {inPrep.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">{t("asporto.empty")}</p>}
          {inPrep.map((o) => <OrderCard key={o.id} order={o} onAdvance={() => advanceStatus(o)} onCancel={() => cancelOrder(o)} onPrint={() => printTicket(o)} t={t} />)}
        </KdsColumn>
        <KdsColumn title={t("asporto.status.pronto")} tone="ready" count={pronti.length}>
          {pronti.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">{t("asporto.empty")}</p>}
          {pronti.map((o) => <OrderCard key={o.id} order={o} onAdvance={() => advanceStatus(o)} onCancel={() => cancelOrder(o)} onPrint={() => printTicket(o)} t={t} />)}
        </KdsColumn>
        <KdsColumn title={t("asporto.completed")} tone="ready" count={completati.length}>
          {completati.length === 0 && annullati.length === 0 && <p className="py-4 text-center text-xs text-rw-muted">{t("asporto.empty")}</p>}
          {completati.map((o) => <OrderCard key={o.id} order={o} onAdvance={() => advanceStatus(o)} onCancel={() => cancelOrder(o)} onPrint={() => printTicket(o)} t={t} />)}
          {annullati.map((o) => <OrderCard key={o.id} order={o} onAdvance={() => advanceStatus(o)} onCancel={() => cancelOrder(o)} onPrint={() => printTicket(o)} t={t} />)}
        </KdsColumn>
      </div>
    </div>
  );
}
