"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  XCircle,
  RotateCcw,
  Download,
  Eye,
  PackagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import { useWarehouse } from "@/components/warehouse/warehouse-context";
import {
  bollaImportApi,
  suppliersApi,
  type BollaImportLine,
  type BollaImportRecord,
  type Supplier,
} from "@/lib/api-client";
import {
  WAREHOUSE_CATEGORIES,
} from "@/lib/warehouse/bolla-import/categories";
import {
  WAREHOUSE_LOCATIONS,
  WAREHOUSE_LOCATION_LABELS,
} from "@/lib/api/types/warehouse";

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink focus:border-[#D4AF37]/50 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30";
const LABEL = "block text-xs font-bold uppercase tracking-wide text-rw-muted mb-1.5";
const GOLD_CARD =
  "rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-b from-rw-surface to-rw-surfaceAlt/90 shadow-[0_4px_24px_rgba(0,0,0,0.18)]";
const GOLD_BTN =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-[#D4AF37]/50 bg-gradient-to-b from-[#D4AF37]/25 to-[#D4AF37]/5 px-6 text-sm font-bold uppercase tracking-wide text-[#E8C547] transition hover:border-[#D4AF37] hover:from-[#D4AF37]/35 active:scale-[0.98] disabled:opacity-50";

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve({ base64, mimeType: file.type || "application/octet-stream" });
    };
    reader.onerror = () => reject(new Error("Lettura file non riuscita"));
    reader.readAsDataURL(file);
  });
}

type DashboardStats = Awaited<ReturnType<typeof bollaImportApi.dashboard>>;

export function BollaAiImportPanel() {
  const { t } = useI18n();
  const { refresh } = useWarehouse();
  const fileRef = useRef<HTMLInputElement>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [current, setCurrent] = useState<BollaImportRecord | null>(null);
  const [lines, setLines] = useState<BollaImportLine[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await bollaImportApi.dashboard();
      setDashboard(data);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    suppliersApi.list().then(setSuppliers).catch(() => setSuppliers([]));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadDashboard]);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPoll = (importId: string) => {
    stopPoll();
    pollRef.current = setInterval(() => {
      void bollaImportApi.get(importId).then(({ import: imp }) => {
        setCurrent(imp);
        if (imp.status === "review" || imp.status === "completed" || imp.status === "failed") {
          setLines(imp.lines);
          stopPoll();
          setUploading(false);
          void loadDashboard();
        }
      }).catch(() => stopPoll());
    }, 800);
  };

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !supplierId) {
      setError(t("magazzino.bollaAi.selectSupplier"));
      return;
    }
    const file = files[0]!;
    setError(null);
    setUploading(true);
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      const { importId, import: imp } = await bollaImportApi.start({
        supplierId,
        fileName: file.name,
        mimeType,
        contentBase64: base64,
      });
      if (imp) {
        setCurrent(imp);
        setLines(imp.lines);
      }
      startPoll(importId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore upload");
      setUploading(false);
    }
  }

  function updateLine(id: string, patch: Partial<BollaImportLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function handleImport() {
    if (!current) return;
    setImporting(true);
    setError(null);
    try {
      const { import: imp } = await bollaImportApi.confirm(
        current.id,
        lines.map((l) => ({
          id: l.id,
          selected: l.selected,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          vatPct: l.vatPct,
          selectedCategory: l.selectedCategory,
          warehouseLocation: l.warehouseLocation,
          warehouseItemId: l.warehouseItemId,
          createProduct: l.matchStatus === "new" && !l.warehouseItemId,
        })),
      );
      setCurrent(imp);
      setLines(imp.lines);
      await refresh();
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore importazione");
    } finally {
      setImporting(false);
    }
  }

  async function handleUndo() {
    if (!current) return;
    try {
      const { import: imp } = await bollaImportApi.undo(current.id);
      setCurrent(imp);
      await refresh();
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Annullamento non riuscito");
    }
  }

  const inProgress =
    uploading ||
    (current != null &&
      !["review", "completed", "failed", "undone"].includes(current.status));

  return (
    <div className="space-y-5">
      {/* Dashboard widget */}
      {dashboard && (
        <div className={`${GOLD_CARD} p-4 sm:p-5`}>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-[#D4AF37]">
            {t("magazzino.bollaAi.dashboard")}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label={t("magazzino.bollaAi.stat.imports")} value={dashboard.stats.totalImports} />
            <Stat label={t("magazzino.bollaAi.stat.recognized")} value={dashboard.stats.itemsRecognized} accent />
            <Stat label={t("magazzino.bollaAi.stat.newItems")} value={dashboard.stats.itemsNew} />
            <Stat label={t("magazzino.bollaAi.stat.ocrErrors")} value={dashboard.stats.ocrErrors} danger={dashboard.stats.ocrErrors > 0} />
            <Stat
              label={t("magazzino.bollaAi.stat.avgTime")}
              value={
                dashboard.stats.avgDurationMs != null
                  ? `${(dashboard.stats.avgDurationMs / 1000).toFixed(1)}s`
                  : "—"
              }
            />
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div className={`${GOLD_CARD} p-4 sm:p-6`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/15">
              <Sparkles className="h-6 w-6 text-[#E8C547]" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-rw-ink">{t("magazzino.bollaAi.title")}</h2>
              <p className="text-sm text-rw-muted">{t("magazzino.bollaAi.subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className={LABEL}>{t("magazzino.bollaAi.supplier")}</label>
          <select className={INPUT} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">{t("magazzino.bollaAi.selectSupplier")}</option>
            {suppliers.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          className={cn(
            "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition duration-200",
            dragOver
              ? "border-[#D4AF37] bg-[#D4AF37]/10 scale-[1.01]"
              : "border-rw-line/60 bg-rw-surfaceAlt/50 hover:border-[#D4AF37]/40",
          )}
        >
          <Upload className="h-10 w-10 text-[#D4AF37]" />
          <p className="text-center text-sm font-semibold text-rw-ink">{t("magazzino.bollaAi.dropzone")}</p>
          <p className="text-center text-xs text-rw-muted">PDF · JPG · PNG · Scansione · Foto</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>

        <button
          type="button"
          className={cn(GOLD_BTN, "mt-4 w-full")}
          disabled={!supplierId || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
          {t("magazzino.bollaAi.uploadBtn")}
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {/* Progress */}
      {current && inProgress && (
        <div className={`${GOLD_CARD} p-5`}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-rw-ink">{current.currentStep}</span>
            <span className="tabular-nums text-[#E8C547]">{current.progressPct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-rw-surfaceAlt">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E8C547] transition-all duration-500"
              style={{ width: `${current.progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-rw-muted">{t("magazzino.bollaAi.processing")}</p>
        </div>
      )}

      {/* Review table */}
      {current?.status === "review" && lines.length > 0 && (
        <div className={`${GOLD_CARD} overflow-hidden`}>
          <header className="border-b border-rw-line/50 px-4 py-3 sm:px-5">
            <h3 className="font-display text-base font-bold text-rw-ink">{t("magazzino.bollaAi.review")}</h3>
            <p className="text-xs text-rw-muted">
              {current.supplierName}
              {current.bollaNumber ? ` · Bolla ${current.bollaNumber}` : ""}
              {current.totalAmount != null ? ` · € ${current.totalAmount.toFixed(2)}` : ""}
            </p>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="bg-rw-surfaceAlt text-xs uppercase text-rw-muted">
                <tr>
                  <th className="px-3 py-2 text-left">□</th>
                  <th className="px-3 py-2 text-left">{t("magazzino.col.product")}</th>
                  <th className="px-3 py-2 text-left">{t("magazzino.bollaAi.category")}</th>
                  <th className="px-3 py-2 text-left">{t("magazzino.bollaAi.location")}</th>
                  <th className="px-3 py-2 text-right">{t("magazzino.col.qty")}</th>
                  <th className="px-3 py-2 text-right">{t("magazzino.bollaAi.price")}</th>
                  <th className="px-3 py-2 text-right">IVA</th>
                  <th className="px-3 py-2 text-left">{t("magazzino.bollaAi.status")}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-t border-rw-line/30 hover:bg-rw-surfaceAlt/40">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={line.selected}
                        onChange={(e) => updateLine(line.id, { selected: e.target.checked })}
                        className="h-4 w-4 accent-[#D4AF37]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="min-w-[8rem] rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-sm"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-xs"
                        value={line.selectedCategory}
                        onChange={(e) => updateLine(line.id, { selectedCategory: e.target.value })}
                      >
                        {WAREHOUSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-xs"
                        value={line.warehouseLocation}
                        onChange={(e) => updateLine(line.id, { warehouseLocation: e.target.value })}
                      >
                        {WAREHOUSE_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>{WAREHOUSE_LOCATION_LABELS[loc]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-20 rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-right text-sm"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="ml-1 text-xs text-rw-muted">{line.unit}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-right text-sm"
                        value={line.unitPrice ?? ""}
                        onChange={(e) => updateLine(line.id, { unitPrice: parseFloat(e.target.value) || null })}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        className="w-16 rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 py-1 text-right text-sm"
                        value={line.vatPct ?? ""}
                        onChange={(e) => updateLine(line.id, { vatPct: parseFloat(e.target.value) || null })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {line.matchStatus === "matched" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {line.warehouseItemName ?? t("magazzino.bollaAi.existing")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2 py-1 text-xs font-bold text-[#E8C547]"
                          onClick={() => updateLine(line.id, { matchStatus: "new" })}
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          {t("magazzino.bollaAi.createProduct")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-wrap gap-3 border-t border-rw-line/50 p-4">
            <button type="button" className={cn(GOLD_BTN, "flex-1")} disabled={importing} onClick={() => void handleImport()}>
              {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {t("magazzino.bollaAi.importBtn")}
            </button>
            {current.documentFileName && (
              <>
                <a
                  href={bollaImportApi.documentUrl(current.id, "inline")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl border border-rw-line px-4 text-sm font-semibold text-rw-ink hover:border-[#D4AF37]/40"
                >
                  <Eye className="h-4 w-4" /> PDF
                </a>
                <a
                  href={bollaImportApi.documentUrl(current.id, "download")}
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl border border-rw-line px-4 text-sm font-semibold text-rw-ink hover:border-[#D4AF37]/40"
                >
                  <Download className="h-4 w-4" /> {t("magazzino.bollaAi.download")}
                </a>
              </>
            )}
          </footer>
        </div>
      )}

      {/* Completed */}
      {current?.status === "completed" && (
        <div className={`${GOLD_CARD} p-5 text-center`}>
          <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-emerald-400" />
          <p className="font-display text-lg font-bold text-rw-ink">{t("magazzino.bollaAi.completed")}</p>
          <p className="mt-1 text-sm text-rw-muted">
            {current.lineCount} articoli · {current.durationMs != null ? `${(current.durationMs / 1000).toFixed(1)}s` : ""}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button type="button" className={GOLD_BTN} onClick={() => { setCurrent(null); setLines([]); }}>
              {t("magazzino.bollaAi.newImport")}
            </button>
            <button
              type="button"
              className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 text-sm font-bold text-red-300"
              onClick={() => void handleUndo()}
            >
              <RotateCcw className="h-4 w-4" /> {t("magazzino.bollaAi.undo")}
            </button>
          </div>
        </div>
      )}

      {current?.status === "failed" && (
        <div className={`${GOLD_CARD} p-5 text-center`}>
          <XCircle className="mx-auto mb-2 h-12 w-12 text-red-400" />
          <p className="font-bold text-red-300">{current.errorMessage ?? t("magazzino.bollaAi.failed")}</p>
          <button type="button" className={cn(GOLD_BTN, "mt-4")} onClick={() => { setCurrent(null); setLines([]); }}>
            {t("magazzino.bollaAi.retry")}
          </button>
        </div>
      )}

      {/* Recent imports */}
      {dashboard && dashboard.recentImports.length > 0 && (
        <div className={`${GOLD_CARD} p-4`}>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-rw-muted">
            {t("magazzino.bollaAi.recent")}
          </h3>
          <ul className="space-y-2">
            {dashboard.recentImports.map((imp) => (
              <li
                key={imp.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rw-line/40 bg-rw-surfaceAlt/50 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-rw-ink">{imp.supplierName}</span>
                <span className="text-xs text-rw-muted">{imp.lineCount} righe · {imp.status}</span>
                <span className="text-xs tabular-nums text-rw-muted">
                  {new Date(imp.createdAt).toLocaleString("it-IT")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-rw-line/50 bg-rw-surfaceAlt/80 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-rw-muted">{label}</p>
      <p
        className={cn(
          "font-display text-xl font-bold tabular-nums",
          danger ? "text-red-400" : accent ? "text-[#E8C547]" : "text-rw-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
