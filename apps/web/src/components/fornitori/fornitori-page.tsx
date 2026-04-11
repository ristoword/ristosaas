"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  CreditCard,
  FileText,
  Mail,
  Phone,
  Plus,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { Card } from "@/components/shared/card";
import { DataTable } from "@/components/shared/data-table";
import { Modal } from "@/components/shared/modal";
import { TabBar } from "@/components/shared/tab-bar";

/* ------------------------------------------------------------------ */
/*  Types & mock data                                                  */
/* ------------------------------------------------------------------ */

type Supplier = {
  id: string;
  name: string;
  vat: string;
  address: string;
  phone: string;
  email: string;
  iban: string;
  paymentTerms: string;
  notes: string;
};

type SupplierOrder = {
  id: string;
  supplierId: string;
  date: string;
  products: string;
  total: number;
  status: "inviato" | "confermato" | "consegnato" | "annullato";
};

type Invoice = {
  id: string;
  supplierId: string;
  number: string;
  date: string;
  amount: number;
  due: string;
  paid: boolean;
};

const mockSuppliers: Supplier[] = [
  { id: "s1", name: "Molino Rossi S.r.l.", vat: "IT01234567890", address: "Via della Farina 12, Napoli", phone: "+39 081 1234567", email: "ordini@molinorossi.it", iban: "IT60X0542811101000000123456", paymentTerms: "30 gg DFFM", notes: "Consegna martedì e giovedì" },
  { id: "s2", name: "Caseificio Ferrara", vat: "IT09876543210", address: "Contrada Bufalara 5, Caserta", phone: "+39 0823 987654", email: "info@caseificioferrara.it", iban: "IT40R0100503214000000054321", paymentTerms: "60 gg DFFM", notes: "Mozzarella DOP" },
  { id: "s3", name: "Ortofrutticola Sud S.p.A.", vat: "IT11223344556", address: "Centro Agroalimentare, Salerno", phone: "+39 089 5551234", email: "commerciale@ortosud.it", iban: "IT15T0633403200000012345678", paymentTerms: "15 gg", notes: "Consegna giornaliera ore 6:00" },
  { id: "s4", name: "Oleificio Ferrante", vat: "IT55667788990", address: "SP 14 km 3, Bitonto (BA)", phone: "+39 080 3456789", email: "vendite@oleificioferrante.it", iban: "IT22K0503404000000000056789", paymentTerms: "30 gg", notes: "Olio EVO e condimenti" },
  { id: "s5", name: "Cantina dei Colli", vat: "IT33445566778", address: "Loc. Vigneti 8, Montepulciano (SI)", phone: "+39 0578 654321", email: "ordini@cantinacolli.it", iban: "IT80E0306909606100000000123", paymentTerms: "90 gg DFFM", notes: "DOC e DOCG Toscana" },
  { id: "s6", name: "Beverage Italia S.r.l.", vat: "IT44556677889", address: "Via Industriale 22, Roma", phone: "+39 06 7654321", email: "orders@beverageitalia.it", iban: "IT90F0760103200001012345678", paymentTerms: "30 gg", notes: "Bibite, birre, spirits" },
];

const mockOrders: SupplierOrder[] = [
  { id: "so1", supplierId: "s1", date: "2026-04-10", products: "Farina 00 x50kg, Lievito x5kg", total: 58.5, status: "consegnato" },
  { id: "so2", supplierId: "s1", date: "2026-04-08", products: "Farina Manitoba x30kg", total: 33, status: "consegnato" },
  { id: "so3", supplierId: "s2", date: "2026-04-11", products: "Mozzarella bufala x10kg", total: 125, status: "confermato" },
  { id: "so4", supplierId: "s3", date: "2026-04-11", products: "Pomodoro SM x30kg, Basilico x4kg", total: 108, status: "inviato" },
  { id: "so5", supplierId: "s4", date: "2026-04-05", products: "Olio EVO x20L", total: 178, status: "consegnato" },
  { id: "so6", supplierId: "s5", date: "2026-04-03", products: "Montepulciano x24bt, Chianti x12bt", total: 216, status: "consegnato" },
  { id: "so7", supplierId: "s6", date: "2026-04-09", products: "Coca-Cola x5ct, Birra Moretti x3ct", total: 142, status: "confermato" },
];

const mockInvoices: Invoice[] = [
  { id: "inv1", supplierId: "s1", number: "FT-2026/0412", date: "2026-04-01", amount: 580, due: "2026-05-01", paid: true },
  { id: "inv2", supplierId: "s1", number: "FT-2026/0498", date: "2026-04-10", amount: 91.5, due: "2026-05-10", paid: false },
  { id: "inv3", supplierId: "s2", number: "001/2026", date: "2026-03-28", amount: 375, due: "2026-05-28", paid: false },
  { id: "inv4", supplierId: "s3", number: "SA-1042", date: "2026-04-08", amount: 245, due: "2026-04-23", paid: true },
  { id: "inv5", supplierId: "s4", number: "OLF-226", date: "2026-04-05", amount: 178, due: "2026-05-05", paid: false },
  { id: "inv6", supplierId: "s5", number: "CC-2026-088", date: "2026-04-03", amount: 216, due: "2026-07-03", paid: false },
  { id: "inv7", supplierId: "s6", number: "BI-4410", date: "2026-04-09", amount: 142, due: "2026-05-09", paid: false },
];

const DETAIL_TABS = [
  { id: "anagrafica", label: "Anagrafica" },
  { id: "ordini", label: "Ordini" },
  { id: "fatture", label: "Fatture" },
  { id: "pagamenti", label: "Pagamenti" },
];

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";

const LABEL = "block text-xs font-semibold text-rw-muted mb-1";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98]";

const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-2.5 text-sm font-semibold text-rw-ink transition hover:border-rw-accent/30 active:scale-[0.98]";

const orderStatusColors: Record<SupplierOrder["status"], string> = {
  inviato: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  confermato: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  consegnato: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  annullato: "border-red-500/30 bg-red-500/10 text-red-400",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FornitoriPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [selectedId, setSelectedId] = useState<string | null>(mockSuppliers[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [detailTab, setDetailTab] = useState("anagrafica");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.vat.toLowerCase().includes(search.toLowerCase()),
      ),
    [suppliers, search],
  );

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;

  function updateSupplier(patch: Partial<Supplier>) {
    if (!selectedId) return;
    setSuppliers((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)),
    );
  }

  function addSupplier(s: Omit<Supplier, "id">) {
    const ns: Supplier = { ...s, id: `s-${Date.now()}` };
    setSuppliers((prev) => [...prev, ns]);
    setSelectedId(ns.id);
    setModalOpen(false);
    setDetailTab("anagrafica");
  }

  function removeSupplier(id: string) {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fornitori" subtitle="Anagrafica, ordini, fatture e pagamenti">
        <Chip label="Fornitori" value={suppliers.length} tone="info" />
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
                    <p className="truncate text-xs text-rw-muted">{s.vat}</p>
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
                  <p className="text-sm text-rw-muted">{selected.vat}</p>
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
              {detailTab === "ordini" && <OrdiniPanel supplierId={selected.id} />}
              {detailTab === "fatture" && <FatturePanel supplierId={selected.id} />}
              {detailTab === "pagamenti" && <PagamentiPanel supplierId={selected.id} />}
            </>
          )}
        </div>
      </div>

      {/* New supplier modal */}
      <NewSupplierModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={addSupplier} />
    </div>
  );
}

/* ================================================================== */
/*  Anagrafica panel                                                   */
/* ================================================================== */

function AnagraficaPanel({
  supplier,
  onUpdate,
}: {
  supplier: Supplier;
  onUpdate: (patch: Partial<Supplier>) => void;
}) {
  const [flash, setFlash] = useState(false);

  function save() {
    setFlash(true);
    setTimeout(() => setFlash(false), 2200);
  }

  return (
    <Card title="Dati anagrafici">
      {flash && (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300" role="status">
          Dati salvati con successo (simulato).
        </p>
      )}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Ragione sociale</label>
            <input className={INPUT} value={supplier.name} onChange={(e) => onUpdate({ name: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>P.IVA / Cod. Fiscale</label>
            <input className={INPUT} value={supplier.vat} onChange={(e) => onUpdate({ vat: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Indirizzo</label>
          <input className={INPUT} value={supplier.address} onChange={(e) => onUpdate({ address: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Telefono</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input className={cn(INPUT, "pl-9")} value={supplier.phone} onChange={(e) => onUpdate({ phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
              <input className={cn(INPUT, "pl-9")} value={supplier.email} onChange={(e) => onUpdate({ email: e.target.value })} />
            </div>
          </div>
        </div>
        <div>
          <label className={LABEL}>IBAN</label>
          <div className="relative">
            <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
            <input className={cn(INPUT, "pl-9")} value={supplier.iban} onChange={(e) => onUpdate({ iban: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Termini di pagamento</label>
          <input className={INPUT} value={supplier.paymentTerms} onChange={(e) => onUpdate({ paymentTerms: e.target.value })} placeholder="es. 30 gg DFFM" />
        </div>
        <div>
          <label className={LABEL}>Note</label>
          <textarea className={cn(INPUT, "resize-y")} rows={3} value={supplier.notes} onChange={(e) => onUpdate({ notes: e.target.value })} placeholder="Note interne…" />
        </div>
        <button type="button" className={cn(BTN_PRIMARY, "w-full sm:w-auto")} onClick={save}>
          <Save className="h-4 w-4" /> Salva
        </button>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Ordini panel                                                       */
/* ================================================================== */

function OrdiniPanel({ supplierId }: { supplierId: string }) {
  const supplierOrders = useMemo(
    () => mockOrders.filter((o) => o.supplierId === supplierId),
    [supplierId],
  );

  return (
    <Card title="Ordini fornitore" description={`${supplierOrders.length} ordini`}>
      <DataTable
        columns={[
          { key: "date", header: "Data" },
          { key: "products", header: "Prodotti" },
          { key: "total", header: "Totale", render: (r: SupplierOrder) => `€ ${r.total.toFixed(2)}` },
          {
            key: "status",
            header: "Stato",
            render: (r: SupplierOrder) => (
              <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase", orderStatusColors[r.status])}>
                {r.status}
              </span>
            ),
          },
        ]}
        data={supplierOrders}
        keyExtractor={(r) => r.id}
        emptyMessage="Nessun ordine per questo fornitore"
      />
    </Card>
  );
}

/* ================================================================== */
/*  Fatture panel                                                      */
/* ================================================================== */

function FatturePanel({ supplierId }: { supplierId: string }) {
  const supplierInvoices = useMemo(
    () => mockInvoices.filter((i) => i.supplierId === supplierId),
    [supplierId],
  );

  return (
    <Card title="Fatture" description={`${supplierInvoices.length} fatture`}>
      <DataTable
        columns={[
          { key: "number", header: "Numero" },
          { key: "date", header: "Data" },
          { key: "amount", header: "Importo", render: (r: Invoice) => `€ ${r.amount.toFixed(2)}` },
          { key: "due", header: "Scadenza" },
          {
            key: "paid",
            header: "Stato",
            render: (r: Invoice) =>
              r.paid ? (
                <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-emerald-400">
                  Pagata
                </span>
              ) : (
                <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-amber-400">
                  Da pagare
                </span>
              ),
          },
        ]}
        data={supplierInvoices}
        keyExtractor={(r) => r.id}
        emptyMessage="Nessuna fattura per questo fornitore"
      />
    </Card>
  );
}

/* ================================================================== */
/*  Pagamenti panel                                                    */
/* ================================================================== */

function PagamentiPanel({ supplierId }: { supplierId: string }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const supplierInvoices = useMemo(
    () => mockInvoices.filter((i) => i.supplierId === supplierId),
    [supplierId],
  );

  const filteredInvoices = useMemo(() => {
    let list = supplierInvoices;
    if (dateFrom) list = list.filter((i) => i.date >= dateFrom);
    if (dateTo) list = list.filter((i) => i.date <= dateTo);
    return list;
  }, [supplierInvoices, dateFrom, dateTo]);

  const totalAmount = filteredInvoices.reduce((s, i) => s + i.amount, 0);
  const paidAmount = filteredInvoices.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  const unpaidAmount = totalAmount - paidAmount;

  return (
    <Card title="Riepilogo pagamenti">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Da data</label>
            <input type="date" className={INPUT} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>A data</label>
            <input type="date" className={INPUT} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3">
            <p className="text-xs text-rw-muted">Totale fatturato</p>
            <p className="font-display text-lg font-semibold text-rw-ink">€ {totalAmount.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-xs text-emerald-400">Pagato</p>
            <p className="font-display text-lg font-semibold text-emerald-300">€ {paidAmount.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-xs text-amber-400">Da pagare</p>
            <p className="font-display text-lg font-semibold text-amber-300">€ {unpaidAmount.toFixed(2)}</p>
          </div>
        </div>

        <DataTable
          columns={[
            { key: "number", header: "Fattura" },
            { key: "date", header: "Data" },
            { key: "amount", header: "Importo", render: (r: Invoice) => `€ ${r.amount.toFixed(2)}` },
            { key: "due", header: "Scadenza" },
            {
              key: "paid",
              header: "Pagato",
              render: (r: Invoice) =>
                r.paid ? (
                  <span className="text-emerald-400">Sì</span>
                ) : (
                  <span className="text-amber-400">No</span>
                ),
            },
          ]}
          data={filteredInvoices}
          keyExtractor={(r) => r.id}
          emptyMessage="Nessuna fattura nel periodo selezionato"
        />
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  New supplier modal                                                 */
/* ================================================================== */

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
    vat: "",
    address: "",
    phone: "",
    email: "",
    iban: "",
    paymentTerms: "",
    notes: "",
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
            <input className={INPUT} value={form.vat} onChange={(e) => setForm({ ...form, vat: e.target.value })} placeholder="IT00000000000" />
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
            <label className={LABEL}>IBAN</label>
            <input className={INPUT} value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="IT…" />
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
