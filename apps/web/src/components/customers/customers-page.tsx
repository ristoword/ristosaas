"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Crown,
  Heart,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { customersApi, type Customer } from "@/lib/api-client";

type CustomerType = Customer["type"];

const typeConfig: Record<CustomerType, { label: string; tone: "accent" | "success" | "default" | "info"; icon: typeof Crown }> = {
  vip: { label: "VIP", tone: "accent", icon: Crown },
  habitue: { label: "Habitué", tone: "success", icon: Heart },
  "walk-in": { label: "Walk-in", tone: "default", icon: User },
  new: { label: "Nuovo", tone: "info", icon: Star },
};

const inputCls =
  "rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";

const euro = (n: number) => `€ ${n.toLocaleString("it-IT")}`;

function parseList(s: string): string[] {
  return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CustomerType | "all">("all");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newType, setNewType] = useState<CustomerType>("new");
  const [newAllergies, setNewAllergies] = useState("");
  const [newPreferences, setNewPreferences] = useState("");

  useEffect(() => {
    customersApi
      .list()
      .then(setCustomers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalSpendAll = customers.reduce((s, c) => s + c.totalSpent, 0);
  const avgSpend = customers.length > 0 ? Math.round(totalSpendAll / customers.length) : 0;

  async function handleAddCustomer() {
    if (!newName.trim()) return;
    try {
      const created = await customersApi.create({
        name: newName.trim(),
        email: newEmail,
        phone: newPhone,
        type: newType,
        visits: 0,
        totalSpent: 0,
        avgSpend: 0,
        allergies: newAllergies,
        preferences: newPreferences,
        notes: "",
        lastVisit: new Date().toISOString().slice(0, 10),
      });
      setCustomers((p) => [...p, created]);
      setNewName(""); setNewEmail(""); setNewPhone(""); setNewType("new");
      setNewAllergies(""); setNewPreferences("");
      setShowAdd(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Errore nel salvataggio");
    }
  }

  async function handleDelete(id: string) {
    try {
      await customersApi.delete(id);
      setCustomers((p) => p.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Errore nella cancellazione");
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rw-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-red-400">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Clienti" subtitle="CRM del ristorante — profili, preferenze e analytics">
        <button type="button" onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 rounded-2xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white">
          <UserPlus className="h-4 w-4" /> Nuovo cliente
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2.5 text-sm font-semibold text-rw-accent transition hover:bg-rw-accent/20">
          <Sparkles className="h-4 w-4" /> AI Insights
        </button>
      </PageHeader>

      {showAdd && (
        <Card title="Aggiungi cliente" headerRight={<button type="button" onClick={() => setShowAdd(false)} className="text-rw-muted hover:text-rw-ink"><X className="h-5 w-5" /></button>}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input placeholder="Nome completo" className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input placeholder="Email" className={inputCls} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <input placeholder="Telefono" className={inputCls} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <select className={inputCls} value={newType} onChange={(e) => setNewType(e.target.value as CustomerType)}>
              <option value="new">Nuovo</option>
              <option value="walk-in">Walk-in</option>
              <option value="habitue">Habitué</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input placeholder="Allergie (separate da virgola)" className={inputCls} value={newAllergies} onChange={(e) => setNewAllergies(e.target.value)} />
            <input placeholder="Preferenze (separate da virgola)" className={inputCls} value={newPreferences} onChange={(e) => setNewPreferences(e.target.value)} />
          </div>
          <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white" onClick={handleAddCustomer}>
            <Plus className="h-4 w-4" /> Salva
          </button>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca cliente…" className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt py-2.5 pl-10 pr-4 text-sm text-rw-ink placeholder:text-rw-muted" />
        </div>
        <div className="flex gap-1 rounded-xl border border-rw-line bg-rw-surfaceAlt p-1">
          {(["all", "vip", "habitue", "walk-in", "new"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${typeFilter === t ? "bg-rw-accent/15 text-rw-accent" : "text-rw-muted hover:text-rw-soft"}`}>
              {t === "all" ? "Tutti" : typeConfig[t].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Clienti totali"><p className="font-display text-3xl font-semibold text-rw-ink">{customers.length}</p></Card>
        <Card title="VIP"><p className="font-display text-3xl font-semibold text-rw-accent">{customers.filter((c) => c.type === "vip").length}</p></Card>
        <Card title="Spesa media"><p className="font-display text-3xl font-semibold text-emerald-400">{euro(avgSpend)}</p></Card>
        <Card title="Nuovi (mese)"><p className="font-display text-3xl font-semibold text-blue-400">{customers.filter((c) => c.type === "new").length}</p></Card>
      </div>

      <DataTable
        columns={[
          { key: "name", header: "Nome", render: (r) => (
            <button type="button" onClick={() => setSelected(r)} className="font-semibold text-rw-ink hover:text-rw-accent">{r.name}</button>
          )},
          { key: "type", header: "Tipo", render: (r) => { const cfg = typeConfig[r.type]; return <Chip label={cfg.label} tone={cfg.tone} />; }},
          { key: "visits", header: "Visite" },
          { key: "totalSpent", header: "Spesa totale", render: (r) => <span className="font-semibold text-emerald-400">{euro(r.totalSpent)}</span> },
          { key: "lastVisit", header: "Ultima visita" },
          { key: "allergies", header: "Allergie", render: (r) => {
            const list = parseList(r.allergies);
            return list.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-400"><AlertCircle className="h-3.5 w-3.5" />{list.join(", ")}</span>
            ) : <span className="text-rw-muted">—</span>;
          }},
          { key: "actions", header: "", render: (r) => (
            <button type="button" onClick={() => handleDelete(r.id)} className="rounded-lg p-1.5 text-rw-muted hover:bg-red-500/10 hover:text-red-400" title="Elimina">
              <Trash2 className="h-4 w-4" />
            </button>
          )},
        ]}
        data={filtered}
        keyExtractor={(r) => r.id}
      />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-full max-w-lg rounded-3xl border border-rw-line bg-rw-surface shadow-rw">
            <div className="flex items-start justify-between border-b border-rw-line px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-semibold text-rw-ink">{selected.name}</h2>
                  <Chip label={typeConfig[selected.type].label} tone={typeConfig[selected.type].tone} />
                </div>
                <p className="mt-1 text-sm text-rw-muted">{selected.email} · {selected.phone}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                  <p className="text-xs text-rw-muted">Visite</p>
                  <p className="font-display text-2xl font-semibold text-rw-ink">{selected.visits}</p>
                </div>
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                  <p className="text-xs text-rw-muted">Spesa totale</p>
                  <p className="font-display text-2xl font-semibold text-emerald-400">{euro(selected.totalSpent)}</p>
                </div>
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-center">
                  <p className="text-xs text-rw-muted">Media visita</p>
                  <p className="font-display text-2xl font-semibold text-rw-accent">{euro(selected.avgSpend)}</p>
                </div>
              </div>
              {parseList(selected.allergies).length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-400"><AlertCircle className="h-4 w-4" /> Allergie</p>
                  <p className="mt-1 text-sm text-rw-soft">{parseList(selected.allergies).join(", ")}</p>
                </div>
              )}
              {parseList(selected.preferences).length > 0 && (
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-rw-ink"><Heart className="h-4 w-4 text-rw-accent" /> Preferenze</p>
                  <ul className="mt-1 space-y-1">{parseList(selected.preferences).map((p) => <li key={p} className="text-sm text-rw-soft">• {p}</li>)}</ul>
                </div>
              )}
              {selected.notes && (
                <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                  <p className="text-sm font-semibold text-rw-ink">Note</p>
                  <p className="mt-1 text-sm text-rw-soft">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
