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
import { suppliersApi, type Supplier } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { Modal } from "@/components/shared/modal";
import { TabBar } from "@/components/shared/tab-bar";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";

const DETAIL_TABS = [
  { id: "anagrafica", label: "Anagrafica" },
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
