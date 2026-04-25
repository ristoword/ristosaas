"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Check,
  ChefHat,
  ClipboardList,
  CreditCard,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  ShirtIcon,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { TabBar } from "@/components/shared/tab-bar";
import { Card } from "@/components/shared/card";
import { useAuth } from "@/components/auth/auth-context";
import {
  roomServiceApi,
  type RoomServiceCategory,
  type RoomServiceCatalogItem,
  type RoomServiceItem,
  type RoomServiceOrder,
  type RoomServiceStatus,
} from "@/lib/api-client";

/* ─── Constants ─────────────────────────────────── */

export const CATEGORY_META: Record<RoomServiceCategory, { label: string; icon: React.ElementType; color: string }> = {
  food:          { label: "Ristorazione",     icon: ChefHat,      color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
  laundry:       { label: "Lavanderia",       icon: ShirtIcon,    color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  minibar:       { label: "Minibar",          icon: ClipboardList, color: "text-purple-400 bg-purple-500/15 border-purple-500/30" },
  shoe_cleaning: { label: "Pulizia scarpe",   icon: BedDouble,    color: "text-slate-400 bg-slate-500/15 border-slate-500/30" },
  linen:         { label: "Biancheria",       icon: BedDouble,    color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" },
  amenities:     { label: "Amenities",        icon: ClipboardList, color: "text-pink-400 bg-pink-500/15 border-pink-500/30" },
  transport:     { label: "Trasporto",        icon: Truck,        color: "text-green-400 bg-green-500/15 border-green-500/30" },
  other:         { label: "Altro",            icon: ClipboardList, color: "text-rw-muted bg-rw-surfaceAlt border-rw-line" },
};

export const STATUS_META: Record<RoomServiceStatus, { label: string; color: string }> = {
  pending:          { label: "In attesa",      color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  in_preparation:   { label: "In preparazione", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  out_for_delivery: { label: "In consegna",    color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  delivered:        { label: "Consegnato",     color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  cancelled:        { label: "Annullato",      color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const STATUS_FLOW: RoomServiceStatus[] = ["pending", "in_preparation", "out_for_delivery", "delivered"];

const CATEGORIES = Object.keys(CATEGORY_META) as RoomServiceCategory[];
const MANAGE_ROLES = new Set(["hotel_manager", "supervisor", "owner", "super_admin"]);

const inputCls = "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary = "inline-flex items-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98] disabled:opacity-50";
const btnGhost = "inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm font-medium text-rw-muted transition hover:bg-rw-surfaceAlt hover:text-rw-ink active:scale-[0.98]";

const euro = (n: number) => `€ ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── New Order Modal ────────────────────────────── */

type NewOrderModalProps = {
  open: boolean;
  onClose: () => void;
  catalog: RoomServiceCatalogItem[];
  onSave: (data: {
    roomCode: string; guestName: string; category: RoomServiceCategory;
    items: RoomServiceItem[]; notes: string; assignedTo: string; stayId: string;
  }) => Promise<void>;
};

function NewOrderModal({ open, onClose, catalog, onSave }: NewOrderModalProps) {
  const [roomCode, setRoomCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [category, setCategory] = useState<RoomServiceCategory>("food");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [stayId, setStayId] = useState("");
  const [items, setItems] = useState<RoomServiceItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const catCatalog = catalog.filter((c) => c.category === category);

  useEffect(() => {
    if (open) {
      setRoomCode(""); setGuestName(""); setCategory("food"); setNotes("");
      setAssignedTo(""); setStayId(""); setItems([]); setErr(null);
    }
  }, [open]);

  function addFromCatalog(item: RoomServiceCatalogItem) {
    setItems((prev) => {
      const ex = prev.find((i) => i.name === item.name);
      if (ex) return prev.map((i) => i.name === item.name ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { name: item.name, qty: 1, unitPrice: item.unitPrice }];
    });
  }

  function addCustomItem() {
    setItems((prev) => [...prev, { name: "", qty: 1, unitPrice: 0 }]);
  }

  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  function updateItem(idx: number, patch: Partial<RoomServiceItem>) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  const total = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  async function handleSave() {
    if (!roomCode.trim()) { setErr("Numero camera obbligatorio"); return; }
    if (!guestName.trim()) { setErr("Nome ospite obbligatorio"); return; }
    if (!items.length || items.some((i) => !i.name.trim())) { setErr("Aggiungi almeno un servizio con nome"); return; }
    setSaving(true); setErr(null);
    try {
      await onSave({ roomCode: roomCode.trim(), guestName: guestName.trim(), category, items, notes: notes.trim(), assignedTo: assignedTo.trim(), stayId: stayId.trim() });
      onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : "Errore"); }
    finally { setSaving(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-rw-line bg-rw-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-rw-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-rw-ink">Nuova richiesta servizio</h2>
          <button type="button" onClick={onClose} className="text-rw-muted hover:text-rw-ink"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>N° Camera *</label>
              <input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="101" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome ospite *</label>
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Mario Rossi" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Categoria servizio *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const Icon = meta.icon;
                return (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className={cn("flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                      category === cat ? meta.color : "border-rw-line text-rw-muted hover:border-rw-accent/40")}>
                    <Icon className="h-3.5 w-3.5" />{meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {catCatalog.length > 0 && (
            <div>
              <label className={labelCls}>Aggiungi dal catalogo</label>
              <div className="flex flex-wrap gap-2">
                {catCatalog.map((c) => (
                  <button key={c.id} type="button" onClick={() => addFromCatalog(c)}
                    className="flex items-center gap-1.5 rounded-lg border border-rw-line bg-rw-surfaceAlt px-2.5 py-1.5 text-xs text-rw-ink hover:border-rw-accent/40 hover:bg-rw-surface transition">
                    <Plus className="h-3 w-3" />{c.name} — {euro(c.unitPrice)}/{c.unit}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={cn(labelCls, "mb-0")}>Voci richiesta *</label>
              <button type="button" onClick={addCustomItem} className="text-xs text-rw-accent hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Voce personalizzata
              </button>
            </div>
            <div className="space-y-2">
              {items.length === 0 && (
                <p className="rounded-xl border border-dashed border-rw-line py-4 text-center text-xs text-rw-muted">
                  Aggiungi voci dal catalogo o inserisci manualmente
                </p>
              )}
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_60px_80px_32px] gap-2 items-center">
                  <input value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })}
                    placeholder="Descrizione" className={inputCls} />
                  <input type="number" min={1} value={it.qty} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                    className={inputCls} />
                  <input type="number" min={0} step={0.01} value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                    placeholder="€" className={inputCls} />
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <p className="mt-2 text-right text-sm font-semibold text-rw-ink">Totale: {euro(total)}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Assegna a (operatore)</label>
              <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Es. Luigi — Portiere" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>ID Soggiorno (per addebito)</label>
              <input value={stayId} onChange={(e) => setStayId(e.target.value)} placeholder="ID stay (opzionale)" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Note aggiuntive</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Istruzioni speciali…" className={inputCls} />
          </div>

          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-rw-line px-6 py-4">
          <button type="button" onClick={onClose} className={btnGhost}>Annulla</button>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Salvataggio…" : "Crea richiesta"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Order Card ─────────────────────────────────── */

type OrderCardProps = {
  order: RoomServiceOrder;
  canManage: boolean;
  canCharge: boolean;
  onStatusChange: (id: string, status: RoomServiceStatus) => void;
  onCharge: (id: string) => void;
  onDelete: (id: string) => void;
};

function OrderCard({ order, canManage, canCharge, onStatusChange, onCharge, onDelete }: OrderCardProps) {
  const meta = CATEGORY_META[order.category];
  const statusMeta = STATUS_META[order.status];
  const Icon = meta.icon;
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  return (
    <div className={cn("rounded-2xl border bg-rw-bg p-4 space-y-3", order.status === "cancelled" && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", meta.color)}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-rw-ink">Camera {order.roomCode}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusMeta.color)}>
                {statusMeta.label}
              </span>
            </div>
            <p className="text-xs text-rw-muted">{order.guestName} · {meta.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm font-bold text-rw-ink">{euro(order.total)}</span>
          {order.chargedToFolio && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Addebitato</span>
          )}
        </div>
      </div>

      <div className="space-y-0.5">
        {(order.items as RoomServiceItem[]).map((it, i) => (
          <div key={i} className="flex justify-between text-xs text-rw-muted">
            <span>{it.qty}× {it.name}</span>
            <span>{euro(it.qty * it.unitPrice)}</span>
          </div>
        ))}
      </div>

      {order.notes && <p className="text-xs text-rw-muted italic">&quot;{order.notes}&quot;</p>}

      <div className="flex items-center justify-between text-[11px] text-rw-muted">
        <span>{new Date(order.requestedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
        {order.assignedTo && <span>👤 {order.assignedTo}</span>}
        {order.deliveredAt && <span>✓ {new Date(order.deliveredAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>

      {canManage && order.status !== "cancelled" && order.status !== "delivered" && (
        <div className="flex gap-2 pt-1 border-t border-rw-line/50">
          {nextStatus && (
            <button type="button" onClick={() => onStatusChange(order.id, nextStatus)}
              className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition", STATUS_META[nextStatus].color.replace("border", "hover:border"))}>
              <Check className="h-3.5 w-3.5" />{STATUS_META[nextStatus].label}
            </button>
          )}
          <button type="button" onClick={() => onStatusChange(order.id, "cancelled")}
            className="rounded-xl border border-rw-line px-3 py-2 text-xs text-rw-muted hover:bg-red-500/10 hover:text-red-400 transition">
            Annulla
          </button>
          {order.status === "pending" && (
            <button type="button" onClick={() => onDelete(order.id)}
              className="rounded-xl border border-rw-line px-2 py-2 text-rw-muted hover:text-red-400 transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {canCharge && order.status === "delivered" && !order.chargedToFolio && (
        <button type="button" onClick={() => onCharge(order.id)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition">
          <CreditCard className="h-3.5 w-3.5" />Addebita al conto — {euro(order.total)}
        </button>
      )}
    </div>
  );
}

/* ─── Catalog Manager ────────────────────────────── */

function CatalogManager() {
  const [items, setItems] = useState<RoomServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fName, setFName] = useState("");
  const [fCat, setFCat] = useState<RoomServiceCategory>("food");
  const [fPrice, setFPrice] = useState("");
  const [fUnit, setFUnit] = useState("pz");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    roomServiceApi.listCatalog({ active: false })
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!fName.trim() || !fPrice) return;
    setSaving(true); setErr(null);
    try {
      const item = await roomServiceApi.createCatalogItem({ name: fName.trim(), category: fCat, unitPrice: Number(fPrice), unit: fUnit.trim() || "pz" });
      setItems((prev) => [...prev, item]);
      setFName(""); setFPrice(""); setFUnit("pz");
    } catch (e) { setErr(e instanceof Error ? e.message : "Errore"); }
    finally { setSaving(false); }
  }

  async function toggleActive(item: RoomServiceCatalogItem) {
    const updated = await roomServiceApi.updateCatalogItem(item.id, { active: !item.active }).catch(() => null);
    if (updated) setItems((prev) => prev.map((i) => i.id === item.id ? updated : i));
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa voce?")) return;
    await roomServiceApi.deleteCatalogItem(id).catch(() => {});
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const grouped = CATEGORIES.reduce<Record<string, RoomServiceCatalogItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<string, RoomServiceCatalogItem[]>);

  return (
    <div className="space-y-6">
      <Card title="Aggiungi voce catalogo">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nome servizio</label>
            <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Es. Colazione in camera" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Categoria</label>
            <select value={fCat} onChange={(e) => setFCat(e.target.value as RoomServiceCategory)} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Prezzo unitario (€)</label>
            <input type="number" min={0} step={0.5} value={fPrice} onChange={(e) => setFPrice(e.target.value)} placeholder="15.00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Unità</label>
            <input value={fUnit} onChange={(e) => setFUnit(e.target.value)} placeholder="pz / set / kg" className={inputCls} />
          </div>
        </div>
        {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
        <button type="button" onClick={() => void handleAdd()} disabled={saving || !fName.trim() || !fPrice} className={cn(btnPrimary, "mt-4")}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Aggiungi al catalogo
        </button>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-rw-muted"><Loader2 className="h-5 w-5 animate-spin mr-2" />Caricamento…</div>
      ) : (
        CATEGORIES.filter((c) => grouped[c].length > 0).map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          return (
            <Card key={cat} title={meta.label} description={`${grouped[cat].filter((i) => i.active).length} attive`}>
              <div className="space-y-1.5">
                {grouped[cat].map((item) => (
                  <div key={item.id} className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5", item.active ? "border-rw-line" : "border-rw-line/40 opacity-50")}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", meta.color.split(" ")[0])} />
                      <span className="text-sm font-medium text-rw-ink">{item.name}</span>
                      <span className="text-xs text-rw-muted">{euro(item.unitPrice)} / {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void toggleActive(item)}
                        className={cn("rounded-lg px-2 py-1 text-xs font-semibold transition",
                          item.active ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-rw-surfaceAlt text-rw-muted hover:text-rw-ink")}>
                        {item.active ? "Attiva" : "Disattiva"}
                      </button>
                      <button type="button" onClick={() => void handleDelete(item.id)} className="text-rw-muted hover:text-red-400 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────── */

const TABS = [
  { id: "attivi", label: "Ordini attivi" },
  { id: "storico", label: "Storico" },
  { id: "catalogo", label: "Catalogo" },
];

const FILTER_CATS: Array<{ value: "all" | RoomServiceCategory; label: string }> = [
  { value: "all", label: "Tutti" },
  ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label })),
];

export function HotelRoomServicePage() {
  const { user } = useAuth();
  const canManage = !user?.role || ["reception", "hotel_manager", "supervisor", "owner", "super_admin"].includes(user.role);
  const canCharge = user?.role ? MANAGE_ROLES.has(user.role) : false;
  const showCatalog = canCharge;

  const [tab, setTab] = useState("attivi");
  const [orders, setOrders] = useState<RoomServiceOrder[]>([]);
  const [catalog, setCatalog] = useState<RoomServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCat, setFilterCat] = useState<"all" | RoomServiceCategory>("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [orderRows, catalogRows] = await Promise.all([
        roomServiceApi.list(),
        roomServiceApi.listCatalog(),
      ]);
      setOrders(orderRows);
      setCatalog(catalogRows);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore caricamento"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => { void load(true); }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const active = useMemo(() =>
    orders.filter((o) => !["delivered", "cancelled"].includes(o.status) && (filterCat === "all" || o.category === filterCat)),
    [orders, filterCat],
  );
  const history = useMemo(() =>
    orders.filter((o) => ["delivered", "cancelled"].includes(o.status) && (filterCat === "all" || o.category === filterCat)),
    [orders, filterCat],
  );

  const kpis = useMemo(() => {
    const open = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
    return [
      { label: "Aperti totali", value: open.length, color: "text-rw-accent" },
      { label: "Ristorazione", value: open.filter((o) => o.category === "food").length, color: "text-amber-400" },
      { label: "Lavanderia", value: open.filter((o) => ["laundry", "linen"].includes(o.category)).length, color: "text-blue-400" },
      { label: "Consegnati oggi", value: orders.filter((o) => o.status === "delivered" && o.deliveredAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length, color: "text-emerald-400" },
    ];
  }, [orders]);

  async function handleCreate(data: Parameters<NewOrderModalProps["onSave"]>[0]) {
    const created = await roomServiceApi.create(data);
    setOrders((prev) => [created, ...prev]);
  }

  async function handleStatusChange(id: string, status: RoomServiceStatus) {
    const updated = await roomServiceApi.update(id, { status }).catch((e: Error) => { setError(e.message); return null; });
    if (updated) setOrders((prev) => prev.map((o) => o.id === id ? updated : o));
  }

  async function handleCharge(id: string) {
    if (!confirm("Addebitare questo servizio al folio dell'ospite?")) return;
    try {
      await roomServiceApi.charge(id);
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, chargedToFolio: true } : o));
    } catch (e) { setError(e instanceof Error ? e.message : "Errore addebito"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa richiesta?")) return;
    await roomServiceApi.delete(id).catch(() => {});
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  const visibleTabs = showCatalog ? TABS : TABS.filter((t) => t.id !== "catalogo");

  return (
    <div className="space-y-6">
      <PageHeader title="Room Service" subtitle="Gestione richieste in camera: food, lavanderia, minibar e servizi extra.">
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className={btnGhost}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Aggiorna
        </button>
        {canManage && (
          <button type="button" onClick={() => setModalOpen(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Nuova richiesta
          </button>
        )}
      </PageHeader>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
            <p className="text-sm text-rw-muted">{k.label}</p>
            <p className={cn("mt-2 font-display text-3xl font-semibold", k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <TabBar tabs={visibleTabs} active={tab} onChange={setTab} />
        <div className="flex flex-wrap gap-1 ml-auto">
          {FILTER_CATS.map((f) => (
            <button key={f.value} type="button" onClick={() => setFilterCat(f.value)}
              className={cn("rounded-xl px-3 py-2 text-xs font-semibold transition",
                filterCat === f.value ? "bg-rw-accent/15 text-rw-accent" : "border border-rw-line text-rw-muted hover:text-rw-ink")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-rw-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-3" /> Caricamento ordini…
        </div>
      ) : (
        <>
          {tab === "attivi" && (
            <div>
              {active.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <ClipboardList className="h-12 w-12 text-rw-line" />
                  <p className="text-sm text-rw-muted">Nessun ordine attivo.</p>
                  {canManage && (
                    <button type="button" onClick={() => setModalOpen(true)} className={btnPrimary}>
                      <Plus className="h-4 w-4" /> Nuova richiesta
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {active.map((o) => (
                    <OrderCard key={o.id} order={o} canManage={canManage} canCharge={canCharge}
                      onStatusChange={(id, status) => void handleStatusChange(id, status)}
                      onCharge={(id) => void handleCharge(id)}
                      onDelete={(id) => void handleDelete(id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "storico" && (
            <div>
              {history.length === 0 ? (
                <p className="py-12 text-center text-sm text-rw-muted">Nessun ordine nello storico.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {history.map((o) => (
                    <OrderCard key={o.id} order={o} canManage={false} canCharge={canCharge}
                      onStatusChange={() => {}} onCharge={(id) => void handleCharge(id)} onDelete={() => {}} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "catalogo" && showCatalog && <CatalogManager />}
        </>
      )}

      <NewOrderModal open={modalOpen} onClose={() => setModalOpen(false)} catalog={catalog} onSave={handleCreate} />
    </div>
  );
}
