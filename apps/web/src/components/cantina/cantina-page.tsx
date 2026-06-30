"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Edit2,
  Eye,
  EyeOff,
  Grape,
  Lightbulb,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Wine,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { AiChat, AiToggleButton } from "@/components/ai/ai-chat";
import { cantinaApi, aiOpsApi, type WineCellarItem, type WineCellarCreatePayload, type CantinaAiSnapshot } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { BollaAiImportPanel } from "@/components/magazzino/bolla-ai-import-panel";

const COLORS = ["rosso", "bianco", "rosé", "bollicine", "passito", "orange"] as const;
const BODIES = ["leggero", "medio", "corposo", "forte", "dolce", "secco"] as const;

const COLOR_STYLES: Record<string, string> = {
  rosso: "bg-red-500/15 text-red-400 border-red-500/30",
  bianco: "bg-amber-100/15 text-amber-300 border-amber-400/30",
  rosé: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  bollicine: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  passito: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  orange: "bg-orange-400/15 text-orange-300 border-orange-400/30",
};

const inputCls =
  "w-full rounded-lg border border-rw-line bg-rw-bg px-3 py-2 text-sm text-rw-ink placeholder:text-rw-muted focus:outline-none focus:ring-1 focus:ring-rw-accent";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";

function emptyForm(): WineCellarCreatePayload {
  return {
    name: "",
    producer: "",
    country: "Italia",
    region: "",
    color: "rosso",
    body: "medio",
    grapeVariety: "",
    alcoholPct: 13,
    vintageYear: new Date().getFullYear() - 2,
    bottlingYear: new Date().getFullYear() - 1,
    pairings: "",
    purchasePrice: 0,
    sellingPrice: 0,
    showPurchasePrice: false,
    stock: 0,
    notes: "",
  };
}

export function CantinaPage() {
  const { t } = useI18n();

  const [wines, setWines] = useState<WineCellarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterColor, setFilterColor] = useState("");

  const [form, setForm] = useState<WineCellarCreatePayload>(emptyForm());
  const [showForm, setShowForm] = useState(false);

  const [editItem, setEditItem] = useState<WineCellarItem | null>(null);
  const [editForm, setEditForm] = useState<WineCellarCreatePayload>(emptyForm());
  const [editSaving, setEditSaving] = useState(false);

  const [showPurchasePrices, setShowPurchasePrices] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiSnapshot, setAiSnapshot] = useState<CantinaAiSnapshot | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadAiInsights = useCallback(async () => {
    setAiLoading(true);
    try {
      const data = await aiOpsApi.cantinaInsights();
      setAiSnapshot(data);
    } catch {
      /* silently fail — panel will show error state */
    } finally {
      setAiLoading(false);
    }
  }, []);

  const loadWines = useCallback(async () => {
    try {
      const data = await cantinaApi.list({
        color: filterColor || undefined,
        q: searchQ.trim().length >= 2 ? searchQ.trim() : undefined,
      });
      setWines(data);
    } catch {
      showFlash(t("cantina.error.load"));
    } finally {
      setLoading(false);
    }
  }, [filterColor, searchQ, t]);

  useEffect(() => {
    void loadWines();
  }, [loadWines]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  }

  function updateForm(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateEditForm(field: string, value: unknown) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const created = await cantinaApi.create(form);
      setWines((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(emptyForm());
      setShowForm(false);
      showFlash(t("cantina.flash.created"));
    } catch (e) {
      showFlash(e instanceof Error ? e.message : t("cantina.error.save"));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(wine: WineCellarItem) {
    setEditItem(wine);
    setEditForm({
      name: wine.name,
      producer: wine.producer,
      country: wine.country,
      region: wine.region,
      color: wine.color,
      body: wine.body,
      grapeVariety: wine.grapeVariety,
      alcoholPct: wine.alcoholPct,
      vintageYear: wine.vintageYear,
      bottlingYear: wine.bottlingYear,
      pairings: wine.pairings,
      purchasePrice: wine.purchasePrice,
      sellingPrice: wine.sellingPrice,
      showPurchasePrice: wine.showPurchasePrice,
      stock: wine.stock,
      notes: wine.notes,
    });
  }

  async function handleUpdate() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      const updated = await cantinaApi.update(editItem.id, editForm);
      setWines((prev) => prev.map((w) => (w.id === editItem.id ? updated : w)));
      setEditItem(null);
      showFlash(t("cantina.flash.updated"));
    } catch (e) {
      showFlash(e instanceof Error ? e.message : t("cantina.error.save"));
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await cantinaApi.delete(id);
      setWines((prev) => prev.filter((w) => w.id !== id));
      showFlash(t("cantina.flash.deleted"));
    } catch (e) {
      showFlash(e instanceof Error ? e.message : t("cantina.error.delete"));
    }
  }

  const stats = {
    total: wines.length,
    rosso: wines.filter((w) => w.color === "rosso").length,
    bianco: wines.filter((w) => w.color === "bianco").length,
    other: wines.filter((w) => !["rosso", "bianco"].includes(w.color)).length,
  };

  const margin = (w: WineCellarItem) =>
    w.sellingPrice > 0 && w.purchasePrice > 0
      ? ((w.sellingPrice - w.purchasePrice) / w.sellingPrice) * 100
      : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("cantina.title")} subtitle={t("cantina.subtitle")}>
        <Chip label={t("cantina.chip.total")} value={stats.total} tone="info" />
        <Chip label={t("cantina.chip.rosso")} value={stats.rosso} tone="danger" />
        <Chip label={t("cantina.chip.bianco")} value={stats.bianco} tone="warn" />
        <button
          type="button"
          onClick={() => setShowPurchasePrices((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
            showPurchasePrices
              ? "border-rw-accent/40 bg-rw-accent/10 text-rw-accent"
              : "border-rw-line bg-rw-surfaceAlt text-rw-muted hover:text-rw-ink",
          )}
        >
          {showPurchasePrices ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {t("cantina.toggle.purchase")}
        </button>
        <AiToggleButton
          onClick={() => {
            setAiPanelOpen((v) => !v);
            if (!aiSnapshot) void loadAiInsights();
          }}
          label={t("cantina.ai.label")}
        />
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rw-accent px-4 py-2 text-xs font-bold text-white hover:bg-rw-accent/85 transition"
        >
          <Plus className="h-4 w-4" />
          {t("cantina.btn.add")}
        </button>
      </PageHeader>

      {flash && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm font-semibold",
            flash.includes("Errore") || flash.includes("Error")
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
          )}
          role="status"
        >
          {flash}
        </div>
      )}

      <BollaAiImportPanel defaultLocation="CANTINA" variant="cantina" />

      {/* Search & filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={t("cantina.search")}
            className={cn(inputCls, "pl-10")}
          />
        </div>
        <select
          value={filterColor}
          onChange={(e) => setFilterColor(e.target.value)}
          className={cn(inputCls, "w-auto min-w-[140px]")}
        >
          <option value="">{t("cantina.filter.all")}</option>
          {COLORS.map((c) => (
            <option key={c} value={c}>
              {t(`cantina.color.${c}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Add wine form */}
      {showForm && (
        <Card title={t("cantina.form.title")} description={t("cantina.form.desc")}>
          <WineForm
            form={form}
            onChange={updateForm}
            onSave={() => void handleCreate()}
            onCancel={() => setShowForm(false)}
            saving={saving}
            t={t}
          />
        </Card>
      )}

      {/* Wine list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-rw-muted" />
        </div>
      ) : wines.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12">
            <Grape className="h-12 w-12 text-rw-line" />
            <p className="text-sm text-rw-muted">{t("cantina.empty")}</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rw-accent px-4 py-2 text-xs font-bold text-white hover:bg-rw-accent/85"
            >
              <Plus className="h-4 w-4" /> {t("cantina.btn.add_first")}
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {wines.map((w) => {
            const m = margin(w);
            return (
              <article
                key={w.id}
                className="group rounded-2xl border border-rw-line bg-rw-surface p-5 shadow-sm transition hover:border-rw-accent/25 hover:shadow-rw-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Wine className="h-4 w-4 shrink-0 text-rw-accent" />
                      <h3 className="truncate font-display text-lg font-semibold text-rw-ink">{w.name}</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-rw-muted truncate">
                      {w.producer}{w.region ? ` · ${w.region}` : ""}{w.country ? ` · ${w.country}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase",
                      COLOR_STYLES[w.color] ?? "bg-rw-surfaceAlt text-rw-muted border-rw-line",
                    )}
                  >
                    {t(`cantina.color.${w.color}`)}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div>
                    <span className="text-rw-muted">{t("cantina.field.body")}: </span>
                    <span className="font-semibold text-rw-soft">{t(`cantina.body.${w.body}`)}</span>
                  </div>
                  <div>
                    <span className="text-rw-muted">{t("cantina.field.alcohol")}: </span>
                    <span className="font-semibold text-rw-soft">{w.alcoholPct}%</span>
                  </div>
                  {w.grapeVariety && (
                    <div className="col-span-2">
                      <span className="text-rw-muted">{t("cantina.field.grape")}: </span>
                      <span className="font-semibold text-rw-soft">{w.grapeVariety}</span>
                    </div>
                  )}
                  {w.vintageYear && (
                    <div>
                      <span className="text-rw-muted">{t("cantina.field.vintage")}: </span>
                      <span className="font-semibold text-rw-soft">{w.vintageYear}</span>
                    </div>
                  )}
                  {w.bottlingYear && (
                    <div>
                      <span className="text-rw-muted">{t("cantina.field.bottling")}: </span>
                      <span className="font-semibold text-rw-soft">{w.bottlingYear}</span>
                    </div>
                  )}
                  {w.pairings && (
                    <div className="col-span-2">
                      <span className="text-rw-muted">{t("cantina.field.pairings")}: </span>
                      <span className="font-semibold text-rw-soft">{w.pairings}</span>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-rw-line/50 pt-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-rw-muted">{t("cantina.field.sell")}</p>
                      <p className="font-display text-xl font-bold text-rw-ink">€{w.sellingPrice.toFixed(2)}</p>
                    </div>
                    {showPurchasePrices && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-rw-muted">{t("cantina.field.buy")}</p>
                        <p className="font-display text-lg font-semibold text-rw-soft">€{w.purchasePrice.toFixed(2)}</p>
                      </div>
                    )}
                    {showPurchasePrices && m !== null && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          m >= 50 ? "bg-emerald-500/15 text-emerald-400" : m >= 30 ? "bg-amber-400/15 text-amber-400" : "bg-red-500/15 text-red-400",
                        )}
                      >
                        {m.toFixed(0)}% {t("cantina.margin")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-rw-muted">
                    <Grape className="h-3.5 w-3.5" />
                    {w.stock} {t("cantina.bottles")}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(w)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-sky-500/20 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> {t("ui.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(w.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("ui.delete")}
                  </button>
                </div>

                {w.notes && (
                  <p className="mt-2 text-xs text-rw-muted italic">{w.notes}</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* AI Insights Panel */}
      {aiPanelOpen && (
        <AiCantinaPanel
          snapshot={aiSnapshot}
          loading={aiLoading}
          onRefresh={loadAiInsights}
          onClose={() => setAiPanelOpen(false)}
          onChatOpen={() => setAiOpen(true)}
          t={t}
        />
      )}

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-rw-line bg-rw-surface p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between sticky top-0 bg-rw-surface pb-2 border-b border-rw-line/40">
              <h2 className="font-display text-lg font-bold text-rw-ink">{t("cantina.edit.title")}</h2>
              <button type="button" onClick={() => setEditItem(null)} className="text-rw-muted hover:text-rw-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            <WineForm
              form={editForm}
              onChange={updateEditForm}
              onSave={() => void handleUpdate()}
              onCancel={() => setEditItem(null)}
              saving={editSaving}
              t={t}
              isEdit
            />
          </div>
        </div>
      )}

      <AiChat context="cantina" open={aiOpen} onClose={() => setAiOpen(false)} title={t("cantina.ai.label")} />
    </div>
  );
}

/* ─── Shared Wine Form ─────────────────────────────── */

type WineFormProps = {
  form: WineCellarCreatePayload;
  onChange: (field: string, value: unknown) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  t: (key: string) => string;
  isEdit?: boolean;
};

function WineForm({ form, onChange, onSave, onCancel, saving, t, isEdit }: WineFormProps) {
  return (
    <div className="space-y-4">
      {/* Name & producer */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>{t("cantina.field.name")} *</label>
          <input value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder={t("cantina.placeholder.name")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("cantina.field.producer")}</label>
          <input value={form.producer} onChange={(e) => onChange("producer", e.target.value)} placeholder={t("cantina.placeholder.producer")} className={inputCls} />
        </div>
      </div>

      {/* Country, region, grape */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>{t("cantina.field.country")}</label>
          <input value={form.country} onChange={(e) => onChange("country", e.target.value)} placeholder={t("cantina.placeholder.country")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("cantina.field.region")}</label>
          <input value={form.region} onChange={(e) => onChange("region", e.target.value)} placeholder={t("cantina.placeholder.region")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("cantina.field.grape")}</label>
          <input value={form.grapeVariety} onChange={(e) => onChange("grapeVariety", e.target.value)} placeholder={t("cantina.placeholder.grape")} className={inputCls} />
        </div>
      </div>

      {/* Color, body, alcohol */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>{t("cantina.field.color")}</label>
          <select value={form.color} onChange={(e) => onChange("color", e.target.value)} className={inputCls}>
            {COLORS.map((c) => (
              <option key={c} value={c}>{t(`cantina.color.${c}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("cantina.field.body")}</label>
          <select value={form.body} onChange={(e) => onChange("body", e.target.value)} className={inputCls}>
            {BODIES.map((b) => (
              <option key={b} value={b}>{t(`cantina.body.${b}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("cantina.field.alcohol")}</label>
          <input type="number" step="0.5" min={0} max={100} value={form.alcoholPct ?? ""} onChange={(e) => onChange("alcoholPct", Number(e.target.value))} placeholder="13.0" className={inputCls} />
        </div>
      </div>

      {/* Vintage, bottling, stock */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>{t("cantina.field.vintage")}</label>
          <input type="number" min={1900} max={2099} value={form.vintageYear ?? ""} onChange={(e) => onChange("vintageYear", e.target.value ? Number(e.target.value) : null)} placeholder="2022" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("cantina.field.bottling")}</label>
          <input type="number" min={1900} max={2099} value={form.bottlingYear ?? ""} onChange={(e) => onChange("bottlingYear", e.target.value ? Number(e.target.value) : null)} placeholder="2023" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("cantina.field.stock")}</label>
          <input type="number" min={0} value={form.stock ?? 0} onChange={(e) => onChange("stock", Number(e.target.value))} className={inputCls} />
        </div>
      </div>

      {/* Prices */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>{t("cantina.field.buy")}</label>
          <input type="number" step="0.01" min={0} value={form.purchasePrice || ""} onChange={(e) => onChange("purchasePrice", Number(e.target.value))} placeholder="0.00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("cantina.field.sell")}</label>
          <input type="number" step="0.01" min={0} value={form.sellingPrice || ""} onChange={(e) => onChange("sellingPrice", Number(e.target.value))} placeholder="0.00" className={inputCls} />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 text-xs text-rw-muted cursor-pointer">
            <input
              type="checkbox"
              checked={form.showPurchasePrice ?? false}
              onChange={(e) => onChange("showPurchasePrice", e.target.checked)}
              className="h-4 w-4 rounded border-rw-line bg-rw-bg text-rw-accent focus:ring-rw-accent"
            />
            {t("cantina.field.show_buy")}
          </label>
        </div>
      </div>

      {/* Pairings */}
      <div>
        <label className={labelCls}>{t("cantina.field.pairings")}</label>
        <input value={form.pairings} onChange={(e) => onChange("pairings", e.target.value)} placeholder={t("cantina.placeholder.pairings")} className={inputCls} />
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>{t("cantina.field.notes")}</label>
        <textarea value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder={t("cantina.placeholder.notes")} rows={2} className={cn(inputCls, "resize-y")} />
      </div>

      {/* Margin preview */}
      {(form.purchasePrice ?? 0) > 0 && (form.sellingPrice ?? 0) > 0 && (
        <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 flex items-center gap-4 text-xs">
          <span className="font-semibold text-rw-accent">{t("cantina.margin_preview")}</span>
          <span className="font-bold text-rw-ink">
            {(((form.sellingPrice! - form.purchasePrice!) / form.sellingPrice!) * 100).toFixed(1)}%
          </span>
          <span className="text-rw-muted">
            (€{(form.sellingPrice! - form.purchasePrice!).toFixed(2)} {t("cantina.per_bottle")})
          </span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.name?.trim()}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-rw-accent/85 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? t("ui.saving") : isEdit ? t("ui.save") : t("cantina.btn.save")}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-rw-line px-4 py-2.5 text-sm text-rw-muted hover:text-rw-ink transition">
          {t("ui.cancel")}
        </button>
      </div>
    </div>
  );
}

/* ─── AI Insights Panel ──────────────────────────────── */

type AiPanelProps = {
  snapshot: CantinaAiSnapshot | null;
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
  onChatOpen: () => void;
  t: (key: string) => string;
};

const MARGIN_COLORS = {
  excellent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  good: "text-sky-400 bg-sky-500/10 border-sky-500/30",
  low: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  loss: "text-red-400 bg-red-500/10 border-red-500/30",
};

const PRIORITY_COLORS = {
  high: "text-red-400 bg-red-500/10 border-red-500/30",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  low: "text-sky-400 bg-sky-500/10 border-sky-500/30",
};

function AiCantinaPanel({ snapshot, loading, onRefresh, onClose, onChatOpen, t }: AiPanelProps) {
  const [activeSection, setActiveSection] = useState<string>("kpi");

  if (loading && !snapshot) {
    return (
      <Card>
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-rw-accent" />
          <span className="text-sm text-rw-muted">{t("cantina.ai.loading")}</span>
        </div>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-12">
          <Sparkles className="h-10 w-10 text-rw-line" />
          <p className="text-sm text-rw-muted">{t("cantina.ai.no_data")}</p>
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-xl bg-rw-accent px-4 py-2 text-xs font-bold text-white hover:bg-rw-accent/85">
            <RefreshCw className="h-4 w-4" /> {t("cantina.ai.refresh")}
          </button>
        </div>
      </Card>
    );
  }

  const { kpi } = snapshot;

  const sections = [
    { id: "kpi", label: t("cantina.ai.tab.kpi"), icon: BarChart3, count: null },
    { id: "alerts", label: t("cantina.ai.tab.alerts"), icon: ShieldAlert, count: kpi.lowStockCount + kpi.outOfStockCount },
    { id: "margins", label: t("cantina.ai.tab.margins"), icon: TrendingUp, count: kpi.lowMarginCount },
    { id: "pricing", label: t("cantina.ai.tab.pricing"), icon: Tag, count: snapshot.pricingSuggestions.length },
    { id: "sales", label: t("cantina.ai.tab.sales"), icon: Lightbulb, count: snapshot.salesRecommendations.length },
    { id: "vintage", label: t("cantina.ai.tab.vintage"), icon: Wine, count: kpi.oldVintageCount },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rw-accent" />
          <h2 className="font-display text-lg font-bold text-rw-ink">{t("cantina.ai.title")}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rw-line px-3 py-1.5 text-xs font-semibold text-rw-muted hover:text-rw-ink transition"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> {t("cantina.ai.refresh")}
          </button>
          <button
            type="button"
            onClick={onChatOpen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rw-accent/30 bg-rw-accent/10 px-3 py-1.5 text-xs font-semibold text-rw-accent hover:bg-rw-accent/20 transition"
          >
            <Sparkles className="h-3.5 w-3.5" /> {t("cantina.ai.chat")}
          </button>
          <button type="button" onClick={onClose} className="text-rw-muted hover:text-rw-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1.5">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              activeSection === s.id
                ? "bg-rw-accent text-white"
                : "bg-rw-surfaceAlt text-rw-muted hover:text-rw-ink",
            )}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
            {s.count !== null && s.count > 0 && (
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                activeSection === s.id ? "bg-white/20 text-white" : "bg-rw-accent/15 text-rw-accent",
              )}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* KPI Dashboard */}
      {activeSection === "kpi" && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard icon={Wine} label={t("cantina.ai.kpi.labels")} value={kpi.totalLabels} />
          <KpiCard icon={Package} label={t("cantina.ai.kpi.stock")} value={kpi.totalStock} suffix={t("cantina.ai.kpi.bottles")} />
          <KpiCard icon={Tag} label={t("cantina.ai.kpi.value")} value={`€${kpi.totalStockValue.toFixed(0)}`} />
          <KpiCard icon={TrendingUp} label={t("cantina.ai.kpi.avg_margin")} value={`${kpi.avgMarginPct.toFixed(0)}%`} tone={kpi.avgMarginPct >= 40 ? "ok" : kpi.avgMarginPct >= 25 ? "warn" : "danger"} />
          <KpiCard icon={AlertTriangle} label={t("cantina.ai.kpi.alerts")} value={kpi.lowStockCount + kpi.outOfStockCount} tone={kpi.lowStockCount + kpi.outOfStockCount > 0 ? "danger" : "ok"} />
        </div>
      )}

      {/* Stock Alerts */}
      {activeSection === "alerts" && (
        <div className="space-y-3">
          {snapshot.outOfStock.length > 0 && (
            <Card title={t("cantina.ai.alerts.out_of_stock")} description={`${snapshot.outOfStock.length} ${t("cantina.ai.alerts.wines")}`}>
              <div className="space-y-2">
                {snapshot.outOfStock.map((w) => (
                  <div key={w.id} className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-rw-ink">{w.name}</p>
                      {w.producer && <p className="text-xs text-rw-muted">{w.producer}</p>}
                      <p className="mt-1 text-xs text-red-400">{w.suggestion}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-red-400">€{w.sellingPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {snapshot.lowStockAlerts.length > 0 && (
            <Card title={t("cantina.ai.alerts.low_stock")} description={`${snapshot.lowStockAlerts.length} ${t("cantina.ai.alerts.wines")}`}>
              <div className="space-y-2">
                {snapshot.lowStockAlerts.map((w) => (
                  <div key={w.id} className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-rw-ink">{w.name}</p>
                      {w.producer && <p className="text-xs text-rw-muted">{w.producer}</p>}
                      <p className="mt-1 text-xs text-amber-400">{w.suggestion}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-amber-400">{w.stock} {t("cantina.bottles")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {snapshot.outOfStock.length === 0 && snapshot.lowStockAlerts.length === 0 && (
            <Card>
              <div className="flex flex-col items-center gap-2 py-8">
                <Package className="h-8 w-8 text-emerald-400" />
                <p className="text-sm text-rw-muted">{t("cantina.ai.alerts.none")}</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Margin Analysis */}
      {activeSection === "margins" && (
        <Card title={t("cantina.ai.margins.title")} description={t("cantina.ai.margins.desc")}>
          {snapshot.marginAnalysis.length > 0 ? (
            <div className="space-y-2">
              {snapshot.marginAnalysis.map((w) => (
                <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-rw-ink">{w.name}</p>
                    <p className="text-xs text-rw-muted">{w.producer}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-rw-muted">
                      €{w.purchasePrice.toFixed(2)} <ArrowUp className="inline h-3 w-3" /> €{w.sellingPrice.toFixed(2)}
                    </span>
                    <span className={cn("rounded-full border px-2 py-0.5 font-bold", MARGIN_COLORS[w.status])}>
                      {w.marginPct.toFixed(0)}%
                    </span>
                  </div>
                  <p className="w-full text-xs text-rw-muted">{w.suggestion}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-rw-muted">{t("cantina.ai.margins.empty")}</p>
          )}
        </Card>
      )}

      {/* Pricing Suggestions */}
      {activeSection === "pricing" && (
        <Card title={t("cantina.ai.pricing.title")} description={t("cantina.ai.pricing.desc")}>
          {snapshot.pricingSuggestions.length > 0 ? (
            <div className="space-y-2">
              {snapshot.pricingSuggestions.map((w) => (
                <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-rw-ink">{w.name}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-rw-muted">€{w.currentPrice.toFixed(2)}</span>
                    {w.suggestedPrice > w.currentPrice ? (
                      <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    <span className="text-rw-accent">€{w.suggestedPrice.toFixed(2)}</span>
                  </div>
                  <p className="w-full text-xs text-rw-muted">{w.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-rw-muted">{t("cantina.ai.pricing.empty")}</p>
          )}
        </Card>
      )}

      {/* Sales Recommendations */}
      {activeSection === "sales" && (
        <Card title={t("cantina.ai.sales.title")} description={t("cantina.ai.sales.desc")}>
          {snapshot.salesRecommendations.length > 0 ? (
            <div className="space-y-2">
              {snapshot.salesRecommendations.map((w, idx) => (
                <div key={`${w.id}-${idx}`} className="flex items-start gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-rw-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-rw-ink">{w.name}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", PRIORITY_COLORS[w.priority])}>
                        {t(`cantina.ai.priority.${w.priority}`)}
                      </span>
                    </div>
                    {w.producer && <p className="text-xs text-rw-muted">{w.producer}</p>}
                    <p className="mt-1 text-xs text-rw-soft">{w.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-rw-muted">{t("cantina.ai.sales.empty")}</p>
          )}
        </Card>
      )}

      {/* Vintage Alerts */}
      {activeSection === "vintage" && (
        <Card title={t("cantina.ai.vintage.title")} description={t("cantina.ai.vintage.desc")}>
          {snapshot.vintageAlerts.length > 0 ? (
            <div className="space-y-2">
              {snapshot.vintageAlerts.map((w) => (
                <div key={w.id} className="flex items-start gap-3 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                  <Wine className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-rw-ink">{w.name}</p>
                      <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                        {w.vintageYear} · {w.age} {t("cantina.ai.vintage.years")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-rw-soft">{w.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-rw-muted">{t("cantina.ai.vintage.empty")}</p>
          )}
        </Card>
      )}
    </div>
  );
}

/* ─── KPI Card ────────────────────────────────────────── */

type KpiCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  suffix?: string;
  tone?: "ok" | "warn" | "danger";
};

function KpiCard({ icon: Icon, label, value, suffix, tone }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-rw-line bg-rw-surface p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn(
          "h-4 w-4",
          tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : tone === "danger" ? "text-red-400" : "text-rw-accent",
        )} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-rw-muted">{label}</span>
      </div>
      <p className={cn(
        "mt-2 font-display text-2xl font-bold",
        tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : tone === "danger" ? "text-red-400" : "text-rw-ink",
      )}>
        {value}
        {suffix && <span className="ml-1 text-sm font-medium text-rw-muted">{suffix}</span>}
      </p>
    </div>
  );
}
