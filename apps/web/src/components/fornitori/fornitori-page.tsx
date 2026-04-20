"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  CreditCard,
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
import {
  purchaseOrdersApi,
  suppliersApi,
  warehouseApi,
  type PurchaseOrder,
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

const DETAIL_TABS = [
  { id: "anagrafica", label: "Anagrafica" },
  { id: "ordini", label: "Ordini & Ricezione" },
];

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";

const LABEL = "block text-xs font-semibold text-rw-muted mb-1";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 active:scale-[0.98]";

export function FornitoriPage() {
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
        <p className="text-sm text-rw-muted">Caricamento fornitori…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fornitori" subtitle="Anagrafica, ordini, fatture e pagamenti">
        <Chip label="Fornitori" value={suppliers.length} tone="info" />
        <AiToggleButton onClick={() => setAiOpen(true)} label="AI Fornitori" />
        <button type="button" className={BTN_PRIMARY} onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Nuovo fornitore
        </button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left sidebar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input className={cn(INPUT, "pl-9")} placeholder="Cerca fornitore…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <li className="py-6 text-center text-sm text-rw-muted">Nessun fornitore trovato</li>
            )}
          </ul>
        </div>

        {/* Right detail panel */}
        <div className="space-y-4">
          {!selected ? (
            <Card title="Dettaglio fornitore">
              <div className="flex flex-col items-center gap-2 py-14 text-rw-muted">
                <Building2 className="h-12 w-12 opacity-30" />
                <p className="text-sm">Seleziona un fornitore dalla lista</p>
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
                  <Trash2 className="h-3.5 w-3.5" /> Elimina
                </button>
              </div>

              <TabBar tabs={DETAIL_TABS} active={detailTab} onChange={setDetailTab} />

              {detailTab === "anagrafica" && (
                <AnagraficaPanel supplier={selected} onUpdate={updateSupplier} />
              )}

              {detailTab === "ordini" && <SupplierOrdersPanel supplier={selected} />}
            </>
          )}
        </div>
      </div>

      <NewSupplierModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={addSupplier} />

      <AiChat context="fornitori" open={aiOpen} onClose={() => setAiOpen(false)} title="AI Fornitori" />
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
    <Card title="Dati anagrafici">
      {flash && (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300" role="status">
          Dati salvati con successo.
        </p>
      )}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Ragione sociale</label>
            <input className={INPUT} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>P.IVA / Cod. Fiscale</label>
            <input className={INPUT} value={draft.piva} onChange={(e) => setDraft({ ...draft, piva: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Indirizzo</label>
          <input className={INPUT} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Telefono</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input className={cn(INPUT, "pl-9")} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input className={cn(INPUT, "pl-9")} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Categoria</label>
            <input className={INPUT} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="es. Alimentari, Bevande…" />
          </div>
          <div>
            <label className={LABEL}>Termini di pagamento</label>
            <input className={INPUT} value={draft.paymentTerms} onChange={(e) => setDraft({ ...draft, paymentTerms: e.target.value })} placeholder="es. 30 gg DFFM" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Rating</label>
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
              Fornitore attivo
            </label>
          </div>
        </div>
        <div>
          <label className={LABEL}>Note</label>
          <textarea className={cn(INPUT, "resize-y")} rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Note interne…" />
        </div>
        <button type="button" className={cn(BTN_PRIMARY, "w-full sm:w-auto")} onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Salvataggio…" : "Salva"}
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
    <Modal open={open} onClose={onClose} title="Nuovo fornitore" subtitle="Compila i dati principali" wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Ragione sociale *</label>
            <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome azienda" />
          </div>
          <div>
            <label className={LABEL}>P.IVA</label>
            <input className={INPUT} value={form.piva} onChange={(e) => setForm({ ...form, piva: e.target.value })} placeholder="IT00000000000" />
          </div>
        </div>
        <div>
          <label className={LABEL}>Indirizzo</label>
          <input className={INPUT} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Via, città" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Telefono</label>
            <input className={INPUT} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+39…" />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input className={INPUT} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@azienda.it" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Categoria</label>
            <input className={INPUT} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Alimentari, Bevande…" />
          </div>
          <div>
            <label className={LABEL}>Termini pagamento</label>
            <input className={INPUT} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="30 gg DFFM" />
          </div>
        </div>
        <div>
          <label className={LABEL}>Note</label>
          <textarea className={cn(INPUT, "resize-y")} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Note…" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            Annulla
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={handleSave}>
            <Save className="h-4 w-4" /> Salva fornitore
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
    return new Date(iso).toLocaleDateString("it-IT", {
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
      setError(err instanceof Error ? err.message : "Errore di caricamento ordini.");
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
        <Chip label="Ordini totali" value={orders.length} tone="default" />
        <Chip
          label="Da ricevere"
          value={orders.filter((o) => o.status === "inviato" || o.status === "parziale").length}
          tone="warn"
        />
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className={BTN_OUTLINE} onClick={() => void refresh()} disabled={loading}>
            {loading ? "Aggiorno…" : "Aggiorna"}
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={() => setNewOpen(true)}
            disabled={stock.length === 0}
          >
            <Plus className="h-4 w-4" /> Nuovo ordine
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
          Non ci sono articoli di magazzino. Aggiungi almeno uno stock item per poter creare un ordine.
        </p>
      ) : null}

      <Card title="Storico ordini">
        {loading ? (
          <p className="py-6 text-center text-sm text-rw-muted">Caricamento…</p>
        ) : orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-rw-muted">Nessun ordine emesso a questo fornitore.</p>
        ) : (
          <DataTable<PurchaseOrder>
            columns={[
              {
                key: "code",
                header: "Codice",
                render: (r) => <span className="font-mono text-xs text-rw-ink">{r.code}</span>,
              },
              { key: "orderedAt", header: "Data", render: (r) => formatDate(r.orderedAt) },
              { key: "expectedAt", header: "Attesa", render: (r) => formatDate(r.expectedAt) },
              {
                key: "status",
                header: "Stato",
                render: (r) => <Chip label={r.status} tone={statusChipTone(r.status)} />,
              },
              {
                key: "items",
                header: "Righe",
                render: (r) => <span className="text-rw-soft">{r.items.length}</span>,
              },
              {
                key: "total",
                header: "Totale",
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
                      Dettagli
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
      subtitle="Aggiungi articoli, quantità e prezzo concordato."
      wide
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={LABEL}>Stato iniziale</label>
            <select
              className={INPUT}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="bozza">Bozza</option>
              <option value="inviato">Inviato</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Consegna attesa</label>
            <input
              type="date"
              className={INPUT}
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Note</label>
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
            <p className="text-sm font-semibold text-rw-ink">Articoli ordinati</p>
            <button type="button" className={cn(BTN_OUTLINE, "px-3 py-1.5 text-xs")} onClick={addLine}>
              <Plus className="h-3.5 w-3.5" /> Aggiungi riga
            </button>
          </div>
          {lines.length === 0 ? (
            <p className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-6 text-center text-sm text-rw-muted">
              Nessuna riga: aggiungi almeno un articolo per creare l&apos;ordine.
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
          <span className="text-sm text-rw-muted">Totale ordine</span>
          <span className="font-display text-lg font-semibold text-rw-ink">€{total.toFixed(2)}</span>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            Annulla
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={handleSubmit}
            disabled={lines.length === 0}
          >
            <Save className="h-4 w-4" /> {status === "bozza" ? "Salva bozza" : "Invia ordine"}
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
}: {
  order: PurchaseOrder | null;
  onClose: () => void;
  onReceive: (order: PurchaseOrder, receipts: Array<{ itemId: string; qty: number }>) => void;
  onStatus: (order: PurchaseOrder, status: "inviato" | "annullato") => void;
}) {
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!order) {
      setDraft({});
      return;
    }
    const d: Record<string, number> = {};
    for (const item of order.items) d[item.id] = 0;
    setDraft(d);
  }, [order]);

  if (!order) return null;

  const readonly = order.status === "ricevuto" || order.status === "annullato";

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
          <Chip label="Data" value={formatDate(order.orderedAt)} />
          <Chip label="Attesa" value={formatDate(order.expectedAt)} />
          <Chip label="Totale" value={`€${order.total.toFixed(2)}`} tone="accent" />
        </div>

        {order.notes ? (
          <p className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm text-rw-soft">
            {order.notes}
          </p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-rw-ink">Righe</p>
            {!readonly ? (
              <button
                type="button"
                className={cn(BTN_OUTLINE, "px-3 py-1.5 text-xs")}
                onClick={fillRemaining}
              >
                Riempi con residuo
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
                    <p className="text-xs text-rw-muted">Ricevuto</p>
                    <p className="text-sm font-semibold text-rw-ink">
                      {item.qtyReceived} {item.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-rw-muted">Residuo</p>
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
                    <p className="text-xs text-rw-muted">Da ricevere ora</p>
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
                      label="Subtotale"
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
              Invia ordine
            </button>
          ) : null}
          {!readonly ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
              onClick={() => onStatus(order, "annullato")}
            >
              <Trash2 className="h-4 w-4" /> Annulla ordine
            </button>
          ) : null}
          {!readonly ? (
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={handleReceive}
              disabled={Object.values(draft).every((v) => (Number(v) || 0) <= 0)}
            >
              <CreditCard className="h-4 w-4" /> Registra ricezione
            </button>
          ) : (
            <p className="text-sm text-rw-muted">Ordine chiuso, nessuna ricezione ulteriore.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
