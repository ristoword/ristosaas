"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Archive,
  Building2,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Phone,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import {
  purchaseOrdersApi,
  suppliersApi,
  warehouseApi,
  type ArchivedSupplierOrderKind,
  type PurchaseOrder,
  type PurchaseOrderReport,
  type StockItem,
  type Supplier,
} from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { Modal } from "@/components/shared/modal";
import { TabBar } from "@/components/shared/tab-bar";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";

const LABEL = "block text-xs font-semibold text-rw-muted mb-1";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 active:scale-[0.98]";

export function FornitoriPage() {
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [detailTab, setDetailTab] = useState("anagrafica");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await suppliersApi.list();
      setSuppliers(data);
      if (data.length > 0) {
        setSelectedId((prev) => prev ?? data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filtered = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.piva.toLowerCase().includes(search.toLowerCase()),
      ),
    [suppliers, search],
  );

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;

  async function updateSupplier(patch: Partial<Supplier>) {
    if (!selectedId) return;
    try {
      const updated = await suppliersApi.update(selectedId, patch);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === selectedId ? updated : s)),
      );
    } catch (err) {
      console.error("Failed to update supplier:", err);
    }
  }

  async function addSupplier(s: Omit<Supplier, "id">) {
    try {
      const created = await suppliersApi.create(s);
      setSuppliers((prev) => [...prev, created]);
      setSelectedId(created.id);
      setModalOpen(false);
      setDetailTab("anagrafica");
    } catch (err) {
      console.error("Failed to create supplier:", err);
    }
  }

  async function removeSupplier(id: string) {
    try {
      await suppliersApi.delete(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      console.error("Failed to delete supplier:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-rw-muted">{t("fornitori.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("fornitori.title")} subtitle={t("fornitori.subtitle")}>
        <Chip label={t("fornitori.title")} value={suppliers.length} tone="info" />
        <AiToggleButton onClick={() => setAiOpen(true)} label={t("fornitori.ai.label")} />
        <button type="button" className={BTN_PRIMARY} onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> {t("fornitori.newSupplier")}
        </button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left sidebar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input className={cn(INPUT, "pl-9")} placeholder={t("ui.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <ul className="space-y-1.5">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedId(s.id); setDetailTab("anagrafica"); }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition",
                    selectedId === s.id
                      ? "border-rw-accent bg-rw-accent/10"
                      : "border-rw-line bg-rw-surfaceAlt hover:border-rw-accent/25",
                  )}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rw-surface text-rw-accent ring-1 ring-rw-line">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-rw-ink">{s.name}</p>
                    <p className="truncate text-xs text-rw-muted">{s.piva}</p>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-6 text-center text-sm text-rw-muted">{t("fornitori.notFound")}</li>
            )}
          </ul>
        </div>

        {/* Right detail panel */}
        <div className="space-y-4">
          {!selected ? (
            <Card title={t("fornitori.detail.title")}>
              <div className="flex flex-col items-center gap-2 py-14 text-rw-muted">
                <Building2 className="h-12 w-12 opacity-30" />
                <p className="text-sm">{t("fornitori.selectFromList")}</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-rw-ink">{selected.name}</h2>
                  <p className="text-sm text-rw-muted">{selected.piva}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSupplier(selected.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("ui.delete")}
                </button>
              </div>

              <TabBar tabs={[{ id: "anagrafica", label: t("fornitori.tab.anagrafica") }, { id: "ordini", label: t("fornitori.tab.ordini") }]} active={detailTab} onChange={setDetailTab} />

              {detailTab === "anagrafica" && (
                <AnagraficaPanel supplier={selected} onUpdate={updateSupplier} />
              )}

              {detailTab === "ordini" && <SupplierOrdersPanel supplier={selected} />}
            </>
          )}
        </div>
      </div>

      <PurchaseReportSection />

      <NewSupplierModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={addSupplier} />

      <AiChat context="fornitori" open={aiOpen} onClose={() => setAiOpen(false)} title={t("fornitori.ai.label")} />
    </div>
  );
}

function AnagraficaPanel({
  supplier,
  onUpdate,
}: {
  supplier: Supplier;
  onUpdate: (patch: Partial<Supplier>) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(supplier);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setDraft(supplier);
  }, [supplier]);

  async function save() {
    setSaving(true);
    await onUpdate({
      name: draft.name,
      piva: draft.piva,
      address: draft.address,
      phone: draft.phone,
      email: draft.email,
      category: draft.category,
      paymentTerms: draft.paymentTerms,
      rating: draft.rating,
      notes: draft.notes,
      active: draft.active,
    });
    setSaving(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 2200);
  }

  return (
    <Card title={t("fornitori.anagrafica.title")}>
      {flash && (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300" role="status">
          {t("fornitori.saved")}
        </p>
      )}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>{t("fornitori.ragioneSociale")}</label>
            <input className={INPUT} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>{t("fornitori.piva")}</label>
            <input className={INPUT} value={draft.piva} onChange={(e) => setDraft({ ...draft, piva: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={LABEL}>{t("fornitori.address")}</label>
          <input className={INPUT} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>{t("ui.phone")}</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input className={cn(INPUT, "pl-9")} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={LABEL}>{t("ui.email")}</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input className={cn(INPUT, "pl-9")} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>{t("fornitori.category")}</label>
            <input className={INPUT} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="es. Alimentari, Bevande…" />
          </div>
          <div>
            <label className={LABEL}>{t("fornitori.paymentTerms")}</label>
            <input className={INPUT} value={draft.paymentTerms} onChange={(e) => setDraft({ ...draft, paymentTerms: e.target.value })} placeholder="es. 30 gg DFFM" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>{t("fornitori.rating")}</label>
            <div className="relative">
              <Star className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input type="number" min={0} max={5} step={0.5} className={cn(INPUT, "pl-9")} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-rw-ink cursor-pointer">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="h-4 w-4 rounded border-rw-line bg-rw-surfaceAlt text-rw-accent focus:ring-rw-accent/30"
              />
              {t("fornitori.active")}
            </label>
          </div>
        </div>
        <div>
          <label className={LABEL}>{t("ui.notes")}</label>
          <textarea className={cn(INPUT, "resize-y")} rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Note interne…" />
        </div>
        <button type="button" className={cn(BTN_PRIMARY, "w-full sm:w-auto")} onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? t("fornitori.saving") : t("ui.save")}
        </button>
      </div>
    </Card>
  );
}

function NewSupplierModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (s: Omit<Supplier, "id">) => void;
}) {
  const { t } = useI18n();
  const empty: Omit<Supplier, "id"> = {
    name: "",
    piva: "",
    address: "",
    phone: "",
    email: "",
    category: "",
    paymentTerms: "",
    rating: 0,
    notes: "",
    active: true,
  };
  const [form, setForm] = useState(empty);

  function handleSave() {
    if (!form.name.trim()) return;
    onSave(form);
    setForm(empty);
  }

  return (
    <Modal open={open} onClose={onClose} title={t("fornitori.newSupplier")} subtitle={t("fornitori.newSupplierSubtitle")} wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>{t("fornitori.ragioneSociale")} *</label>
            <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome azienda" />
          </div>
          <div>
            <label className={LABEL}>{t("fornitori.piva")}</label>
            <input className={INPUT} value={form.piva} onChange={(e) => setForm({ ...form, piva: e.target.value })} placeholder="IT00000000000" />
          </div>
        </div>
        <div>
          <label className={LABEL}>{t("fornitori.address")}</label>
          <input className={INPUT} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Via, città" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>{t("ui.phone")}</label>
            <input className={INPUT} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+39…" />
          </div>
          <div>
            <label className={LABEL}>{t("ui.email")}</label>
            <input className={INPUT} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@azienda.it" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>{t("fornitori.category")}</label>
            <input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Alimentari, Bevande…" />
          </div>
          <div>
            <label className={LABEL}>{t("fornitori.paymentTerms")}</label>
            <input className={INPUT} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="30 gg DFFM" />
          </div>
        </div>
        <div>
          <label className={LABEL}>{t("ui.notes")}</label>
          <textarea className={cn(INPUT, "resize-y")} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Note…" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            {t("ui.cancel")}
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={handleSave}>
            <Save className="h-4 w-4" /> {t("fornitori.saveSupplier")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Panel ordini fornitore ─────────────────────────────────── */

type DraftLine = {
  warehouseItemId: string;
  qtyOrdered: number;
  unit: string;
  unitCost: number;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(document.documentElement.lang || "it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso ?? "—";
  }
}

function statusChipTone(
  status: PurchaseOrder["status"],
): "default" | "info" | "warn" | "success" | "danger" {
  switch (status) {
    case "bozza":
      return "default";
    case "inviato":
      return "info";
    case "parziale":
      return "warn";
    case "ricevuto":
      return "success";
    case "annullato":
      return "danger";
  }
}

function SupplierOrdersPanel({ supplier }: { supplier: Supplier }) {
  const { t } = useI18n();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, stockRes] = await Promise.all([
        suppliersApi.orders(supplier.id),
        warehouseApi.list(),
      ]);
      setOrders(ordersRes);
      setStock(stockRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("fornitori.orders.loadError"));
    } finally {
      setLoading(false);
    }
  }, [supplier.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(draft: {
    notes: string;
    expectedAt: string;
    status: "bozza" | "inviato";
    lines: DraftLine[];
  }) {
    try {
      const created = await suppliersApi.createOrder(supplier.id, {
        notes: draft.notes || undefined,
        expectedAt: draft.expectedAt ? `${draft.expectedAt}T00:00:00Z` : null,
        status: draft.status,
        items: draft.lines.map((l) => ({
          warehouseItemId: l.warehouseItemId,
          qtyOrdered: l.qtyOrdered,
          unit: l.unit,
          unitCost: l.unitCost,
        })),
      });
      setOrders((prev) => [created, ...prev]);
      setNewOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creazione ordine fallita.");
    }
  }

  async function handleReceive(order: PurchaseOrder, receipts: Array<{ itemId: string; qty: number }>) {
    try {
      const updated = await purchaseOrdersApi.receive(order.id, receipts);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setSelected(updated);
      // refresh stock dopo ricezione, così costPerUnit aggiornato
      const stockRes = await warehouseApi.list();
      setStock(stockRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ricezione fallita.");
    }
  }

  async function handleStatus(order: PurchaseOrder, status: "inviato" | "annullato") {
    try {
      const updated = await purchaseOrdersApi.setStatus(order.id, status);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (selected?.id === updated.id) setSelected(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aggiornamento stato fallito.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Chip label={t("fornitori.orders.total")} value={orders.length} tone="default" />
        <Chip
          label={t("fornitori.orders.toReceive")}
          value={orders.filter((o) => o.status === "inviato" || o.status === "parziale").length}
          tone="warn"
        />
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className={BTN_OUTLINE} onClick={() => void refresh()} disabled={loading}>
            {loading ? t("fornitori.orders.refreshing") : t("ui.update")}
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={() => setNewOpen(true)}
            disabled={stock.length === 0}
          >
            <Plus className="h-4 w-4" /> {t("fornitori.orders.new")}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {stock.length === 0 ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          {t("fornitori.orders.noStock")}
        </p>
      ) : null}

      <Card title={t("fornitori.orders.history")}>
        {loading ? (
          <p className="py-6 text-center text-sm text-rw-muted">{t("ui.loading")}</p>
        ) : orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-rw-muted">{t("fornitori.orders.empty")}</p>
        ) : (
          <DataTable<PurchaseOrder>
            columns={[
              {
                key: "code",
                header: t("fornitori.orders.col.code"),
                render: (r) => <span className="font-mono text-xs text-rw-ink">{r.code}</span>,
              },
              { key: "orderedAt", header: t("ui.date"), render: (r) => formatDate(r.orderedAt) },
              { key: "expectedAt", header: t("fornitori.orders.col.expected"), render: (r) => formatDate(r.expectedAt) },
              {
                key: "status",
                header: t("ui.status"),
                render: (r) => <Chip label={r.status} tone={statusChipTone(r.status)} />,
              },
              {
                key: "items",
                header: t("fornitori.orders.col.rows"),
                render: (r) => <span className="text-rw-soft">{r.items.length}</span>,
              },
              {
                key: "total",
                header: t("ui.total"),
                className: "text-right",
                render: (r) => `€${r.total.toFixed(2)}`,
              },
              {
                key: "actions",
                header: "",
                render: (r) => (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className={cn(BTN_OUTLINE, "px-3 py-1.5 text-xs")}
                      onClick={() => setSelected(r)}
                    >
                      {t("fornitori.orders.details")}
                    </button>
                  </div>
                ),
              },
            ]}
            data={orders}
            keyExtractor={(r) => r.id}
          />
        )}
      </Card>

      <NewPurchaseOrderModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        supplier={supplier}
        stock={stock}
        onCreate={handleCreate}
      />

      <PurchaseOrderDetailDrawer
        order={selected}
        onClose={() => setSelected(null)}
        onReceive={handleReceive}
        onStatus={handleStatus}
        onOrderUpdated={(o) => {
          setOrders((prev) => prev.map((row) => (row.id === o.id ? o : row)));
          setSelected(o);
        }}
      />
    </div>
  );
}

function NewPurchaseOrderModal({
  open,
  onClose,
  supplier,
  stock,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  supplier: Supplier;
  stock: StockItem[];
  onCreate: (draft: {
    notes: string;
    expectedAt: string;
    status: "bozza" | "inviato";
    lines: DraftLine[];
  }) => void;
}) {
  const { t } = useI18n();
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [notes, setNotes] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [status, setStatus] = useState<"bozza" | "inviato">("inviato");

  useEffect(() => {
    if (!open) return;
    setLines([]);
    setNotes("");
    setExpectedAt("");
    setStatus("inviato");
  }, [open]);

  const total = lines.reduce((sum, l) => sum + l.qtyOrdered * l.unitCost, 0);

  function addLine() {
    const first = stock[0];
    if (!first) return;
    setLines((prev) => [
      ...prev,
      {
        warehouseItemId: first.id,
        qtyOrdered: 1,
        unit: first.unit,
        unitCost: first.costPerUnit ?? 0,
      },
    ]);
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.warehouseItemId) {
          const item = stock.find((s) => s.id === patch.warehouseItemId);
          if (item) {
            next.unit = item.unit;
            if (!patch.unitCost) next.unitCost = item.costPerUnit ?? 0;
          }
        }
        return next;
      }),
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (lines.length === 0) return;
    onCreate({ notes, expectedAt, status, lines });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Nuovo ordine — ${supplier.name}`}
      subtitle={t("fornitori.orders.modal.subtitle")}
      wide
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={LABEL}>{t("fornitori.orders.modal.initialStatus")}</label>
            <select
              className={INPUT}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="bozza">{t("ui.draft")}</option>
              <option value="inviato">{t("ui.sent")}</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>{t("fornitori.orders.modal.expectedDelivery")}</label>
            <input
              type="date"
              className={INPUT}
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>{t("ui.notes")}</label>
            <input
              className={INPUT}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Riferimenti, trasporto…"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-rw-ink">{t("fornitori.orders.modal.items")}</p>
            <button type="button" className={cn(BTN_OUTLINE, "px-3 py-1.5 text-xs")} onClick={addLine}>
              <Plus className="h-3.5 w-3.5" /> {t("fornitori.orders.modal.addRow")}
            </button>
          </div>
          {lines.length === 0 ? (
            <p className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-6 text-center text-sm text-rw-muted">
              {t("fornitori.orders.modal.emptyRows")}
            </p>
          ) : (
            <div className="space-y-2">
              {lines.map((line, index) => {
                const item = stock.find((s) => s.id === line.warehouseItemId);
                const lineTotal = line.qtyOrdered * line.unitCost;
                return (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                  >
                    <select
                      className={INPUT}
                      value={line.warehouseItemId}
                      onChange={(e) => updateLine(index, { warehouseItemId: e.target.value })}
                    >
                      {stock.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step={0.001}
                      className={INPUT}
                      value={line.qtyOrdered}
                      onChange={(e) =>
                        updateLine(index, { qtyOrdered: Math.max(0, Number(e.target.value)) })
                      }
                    />
                    <input className={INPUT} value={line.unit} readOnly />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={INPUT}
                      value={line.unitCost}
                      onChange={(e) =>
                        updateLine(index, { unitCost: Math.max(0, Number(e.target.value)) })
                      }
                    />
                    <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                      <span className="text-sm font-semibold text-rw-ink">€{lineTotal.toFixed(2)}</span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400"
                        onClick={() => removeLine(index)}
                        aria-label={`Rimuovi riga ${item?.name ?? ""}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
          <span className="text-sm text-rw-muted">{t("fornitori.orders.modal.totalOrder")}</span>
          <span className="font-display text-lg font-semibold text-rw-ink">€{total.toFixed(2)}</span>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            {t("ui.cancel")}
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={handleSubmit}
            disabled={lines.length === 0}
          >
            <Save className="h-4 w-4" /> {status === "bozza" ? t("fornitori.orders.modal.saveDraft") : t("fornitori.orders.modal.sendOrder")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PurchaseOrderDetailDrawer({
  order,
  onClose,
  onReceive,
  onStatus,
  onOrderUpdated,
}: {
  order: PurchaseOrder | null;
  onClose: () => void;
  onReceive: (order: PurchaseOrder, receipts: Array<{ itemId: string; qty: number }>) => void;
  onStatus: (order: PurchaseOrder, status: "inviato" | "annullato") => void;
  onOrderUpdated?: (order: PurchaseOrder) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailFlash, setEmailFlash] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    if (!order) {
      setDraft({});
      setEmailFlash(null);
      setEmailError(null);
      setArchiveError(null);
      return;
    }
    const d: Record<string, number> = {};
    for (const item of order.items) d[item.id] = 0;
    setDraft(d);
  }, [order]);

  if (!order) return null;

  const readonly = order.status === "ricevuto" || order.status === "annullato";

  async function handleEmail() {
    if (!order) return;
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await purchaseOrdersApi.email(order.id, { attachPdf: true });
      setEmailFlash(`Email inviata a ${res.recipients.join(", ")}.`);
      setTimeout(() => setEmailFlash(null), 4000);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Invio email fallito.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleArchiveDocument() {
    if (!order || order.archivedDocumentId || order.status === "annullato") return;
    const kind: ArchivedSupplierOrderKind =
      order.status === "bozza" ? "bozza_confermata" : "ordine_confermato";
    const confirmMsg =
      kind === "bozza_confermata"
        ? `Confermi l'archiviazione del documento come BOZZA?\n\nIl riepilogo verrà registrato nell'Archivio → Ordini fornitore. L'ordine resta in bozza e potrai ancora modificarlo o inviarlo.`
        : `Confermi l'archiviazione del documento come ORDINE EMESSO?\n\nIl riepilogo verrà registrato nell'Archivio → Ordini fornitore (ordine inviato, in ricezione o ricevuto).`;
    if (!window.confirm(confirmMsg)) return;
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      const { order: updated } = await purchaseOrdersApi.archive(order.id, { kind });
      onOrderUpdated?.(updated);
    } catch (e) {
      setArchiveError(e instanceof Error ? e.message : "Archiviazione non riuscita.");
    } finally {
      setArchiveBusy(false);
    }
  }

  function fillRemaining() {
    if (!order) return;
    const next: Record<string, number> = {};
    for (const item of order.items) next[item.id] = item.outstandingQty;
    setDraft(next);
  }

  function handleReceive() {
    if (!order) return;
    const receipts = Object.entries(draft)
      .map(([itemId, qty]) => ({ itemId, qty: Number(qty) || 0 }))
      .filter((r) => r.qty > 0);
    if (receipts.length === 0) return;
    onReceive(order, receipts);
  }

  return (
    <Modal open={!!order} onClose={onClose} title={`Ordine ${order.code}`} subtitle={order.supplierName} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip label={order.status} tone={statusChipTone(order.status)} />
          <Chip label={t("ui.date")} value={formatDate(order.orderedAt)} />
          <Chip label={t("fornitori.orders.col.expected")} value={formatDate(order.expectedAt)} />
          <Chip label={t("ui.total")} value={`€${order.total.toFixed(2)}`} tone="accent" />
          {order.archivedDocumentId ? (
            <Chip label={t("fornitori.orders.archive")} value={t("fornitori.orders.archived")} tone="success" />
          ) : null}
        </div>

        {order.notes ? (
          <p className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-soft">
            {order.notes}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={purchaseOrdersApi.pdfUrl(order.id)}
            target="_blank"
            rel="noreferrer"
            className={cn(BTN_OUTLINE, "text-xs")}
          >
            <FileText className="h-3.5 w-3.5" /> {t("fornitori.orders.pdf")}
          </a>
          <button
            type="button"
            className={cn(BTN_OUTLINE, "text-xs")}
            onClick={() => void handleEmail()}
            disabled={emailBusy || order.status === "annullato"}
          >
            {emailBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            {t("fornitori.orders.email")}
          </button>
          {order.status !== "annullato" && !order.archivedDocumentId ? (
            <button
              type="button"
              className={cn(BTN_OUTLINE, "text-xs")}
              onClick={() => void handleArchiveDocument()}
              disabled={archiveBusy}
            >
              {archiveBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              {t("fornitori.orders.archiveDoc")}
            </button>
          ) : null}
          {emailFlash ? (
            <span className="text-xs font-medium text-emerald-300">{emailFlash}</span>
          ) : null}
          {emailError ? (
            <span className="text-xs font-medium text-red-300">{emailError}</span>
          ) : null}
          {archiveError ? (
            <span className="text-xs font-medium text-red-300">{archiveError}</span>
          ) : null}
        </div>
        {order.archivedDocumentId ? (
          <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200/95">
            {t("fornitori.orders.alreadyArchived")}
          </p>
        ) : (
          <p className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-xs text-rw-muted">
            {t("fornitori.orders.archiveNote")}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-rw-ink">{t("fornitori.orders.modal.rows")}</p>
            {!readonly ? (
              <button
                type="button"
                className={cn(BTN_OUTLINE, "px-3 py-1.5 text-xs")}
                onClick={fillRemaining}
              >
                {t("fornitori.orders.fillRemaining")}
              </button>
            ) : null}
          </div>
          <div className="space-y-2">
            {order.items.map((item) => {
              const inputValue = draft[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className="grid gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
                >
                  <div>
                    <p className="text-sm font-semibold text-rw-ink">{item.warehouseItemName}</p>
                    <p className="text-xs text-rw-muted">
                      {item.qtyOrdered} {item.unit} × €{item.unitCost.toFixed(2)} = €
                      {item.lineTotal.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-rw-muted">{t("fornitori.orders.col.received")}</p>
                    <p className="text-sm font-semibold text-rw-ink">
                      {item.qtyReceived} {item.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-rw-muted">{t("fornitori.orders.col.outstanding")}</p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        item.outstandingQty > 0 ? "text-amber-300" : "text-emerald-300",
                      )}
                    >
                      {item.outstandingQty} {item.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-rw-muted">{t("fornitori.orders.col.toReceiveNow")}</p>
                    <input
                      type="number"
                      min={0}
                      step={0.001}
                      max={item.outstandingQty}
                      className={INPUT}
                      value={inputValue}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [item.id]: Math.max(0, Math.min(item.outstandingQty, Number(e.target.value) || 0)),
                        }))
                      }
                      disabled={readonly || item.outstandingQty <= 0}
                    />
                  </div>
                  <div className="flex items-end">
                    <Chip
                      label={t("magazzino.suggest.subtotal")}
                      value={`€${(inputValue * item.unitCost).toFixed(2)}`}
                      tone={inputValue > 0 ? "success" : "default"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          {order.status === "bozza" ? (
            <button type="button" className={BTN_OUTLINE} onClick={() => onStatus(order, "inviato")}>
              {t("fornitori.orders.modal.sendOrder")}
            </button>
          ) : null}
          {!readonly ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
              onClick={() => onStatus(order, "annullato")}
            >
              <Trash2 className="h-4 w-4" /> {t("fornitori.orders.cancelOrder")}
            </button>
          ) : null}
          {!readonly ? (
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={handleReceive}
              disabled={Object.values(draft).every((v) => (Number(v) || 0) <= 0)}
            >
              <CreditCard className="h-4 w-4" /> {t("fornitori.orders.registerReceival")}
            </button>
          ) : (
            <p className="text-sm text-rw-muted">{t("fornitori.orders.closedNote")}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ── Report acquisti globale ─────────────────────────────── */

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsIso(days: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + days);
  return d.toISOString().slice(0, 10);
}

function PurchaseReportSection() {
  const { t } = useI18n();
  const [from, setFrom] = useState(addMonthsIso(-1));
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<PurchaseOrderReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await purchaseOrdersApi.report({ from, to });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di caricamento report.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card
      title={t("fornitori.report.title")}
      description={t("fornitori.report.desc")}
      headerRight={
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className={INPUT}
            style={{ maxWidth: 160 }}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-xs text-rw-muted">→</span>
          <input
            type="date"
            className={INPUT}
            style={{ maxWidth: 160 }}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button type="button" className={cn(BTN_OUTLINE, "text-xs")} onClick={() => void load()} disabled={loading}>
            {loading ? t("fornitori.orders.refreshing") : t("ui.update")}
          </button>
        </div>
      }
    >
      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {!data || data.suppliers.length === 0 ? (
        <p className="py-6 text-center text-sm text-rw-muted">
          {t("fornitori.report.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricBox label={t("fornitori.report.ordersCount")} value={String(data.overall.ordersCount)} />
            <MetricBox label={t("fornitori.report.totalGross")} value={`€${data.overall.totalGross.toFixed(2)}`} />
            <MetricBox label={t("fornitori.report.received")} value={`€${data.overall.totalReceived.toFixed(2)}`} />
          </div>
          <DataTable<PurchaseOrderReport["suppliers"][number]>
            columns={[
              { key: "supplierName", header: t("fornitori.label") },
              { key: "ordersCount", header: t("fornitori.report.ordersCount"), className: "text-right" },
              {
                key: "totalGross",
                header: t("fornitori.report.totalGross"),
                className: "text-right",
                render: (r) => `€${r.totalGross.toFixed(2)}`,
              },
              {
                key: "totalReceived",
                header: t("fornitori.report.received"),
                className: "text-right",
                render: (r) => `€${r.totalReceived.toFixed(2)}`,
              },
              {
                key: "byStatus",
                header: t("ui.status"),
                render: (r) => (
                  <span className="flex flex-wrap gap-1">
                    {Object.entries(r.byStatus).map(([status, count]) => (
                      <Chip key={status} label={status} value={String(count)} tone="default" />
                    ))}
                  </span>
                ),
              },
            ]}
            data={data.suppliers}
            keyExtractor={(r) => r.supplierId}
          />
        </div>
      )}
    </Card>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-rw-ink">{value}</p>
    </div>
  );
}
