import { analyzeVisionImage } from "@/lib/ai/vision/service";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";
import { wineCellarRepository } from "@/lib/db/repositories/wine-cellar.repository";
import { warehouseBollaImportRepository } from "@/lib/db/repositories/warehouse-bolla-import.repository";
import { normalizeProductKey, suggestCategoryFromRules } from "@/lib/warehouse/bolla-import/categories";
import { matchWarehouseItem } from "@/lib/warehouse/bolla-import/matcher";
import { matchWineItem } from "@/lib/warehouse/bolla-import/wine-matcher";
import type { BollaImportStatus } from "@/lib/warehouse/bolla-import/types";

const STEPS: Array<{ step: string; pct: number; status: BollaImportStatus }> = [
  { step: "Analisi documento", pct: 10, status: "analyzing" },
  { step: "OCR", pct: 35, status: "ocr" },
  { step: "Riconoscimento articoli", pct: 55, status: "ocr" },
  { step: "Matching database", pct: 75, status: "matching" },
  { step: "Revisione", pct: 90, status: "review" },
];

async function setStep(tenantId: string, importId: string, idx: number) {
  const s = STEPS[idx];
  if (!s) return;
  await warehouseBollaImportRepository.updateProgress(tenantId, importId, {
    status: s.status,
    currentStep: s.step,
    progressPct: s.pct,
    startedAt: idx === 0 ? new Date() : undefined,
  });
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function processBollaImportAsync(
  tenantId: string,
  importId: string,
  supplierName: string,
  documentBase64: string,
  documentMime: string,
  defaultWarehouseLocation: string = "MAGAZZINO_CENTRALE",
) {
  const t0 = Date.now();
  try {
    if (documentMime === "application/pdf" || documentMime.includes("pdf")) {
      throw new Error(
        "I PDF non sono supportati per l'OCR. Scatta una foto o esporta la bolla come JPG/PNG.",
      );
    }

    await setStep(tenantId, importId, 0);
    await new Promise((r) => setTimeout(r, 200));

    await setStep(tenantId, importId, 1);
    const taskType = "ddt";
    const vision = await analyzeVisionImage({
      tenantId,
      request: {
        taskType,
        image: documentBase64,
        mimeType: documentMime,
        locale: "it",
        hints: `Documento di carico merce del fornitore ${supplierName}. Estrarre tutte le righe articolo con quantità, unità, prezzo, IVA, sconto, lotto e scadenza.`,
      },
    });

    await setStep(tenantId, importId, 2);

    const doc = vision.analysis.document;
    const rawLines = doc?.lineItems ?? [];
    if (rawLines.length === 0 && vision.source === "fallback") {
      throw new Error(vision.analysis.warnings?.[0] ?? "OCR non disponibile — verifica OPENAI_API_KEY.");
    }

    await warehouseBollaImportRepository.updateProgress(tenantId, importId, {
      documentNumber: doc?.documentNumber ?? null,
      documentDate: parseDate(doc?.documentDate),
      bollaNumber: doc?.documentNumber ?? null,
      invoiceNumber: doc?.notes?.match(/fattura[\s.:]*([A-Z0-9/-]+)/i)?.[1] ?? null,
      vatAmount: doc?.taxAmount ?? null,
      totalAmount: doc?.totalAmount ?? null,
      ocrConfidence: vision.analysis.confidence ?? null,
    });

    await setStep(tenantId, importId, 3);
    const isCantina = defaultWarehouseLocation === "CANTINA";
    const [stockItems, wines] = await Promise.all([
      warehouseRepository.listItems(tenantId),
      isCantina ? wineCellarRepository.list(tenantId) : Promise.resolve([]),
    ]);

    const mappedLines = await Promise.all(
      rawLines.map(async (l, idx) => {
        const description = (l.description ?? "").trim() || `Articolo ${idx + 1}`;
        const productKey = normalizeProductKey(description);
        const learned = await warehouseBollaImportRepository.getLearnedCategory(tenantId, productKey);
        const suggestedCategory = learned ?? suggestCategoryFromRules(description);
        const wineMatch = isCantina ? matchWineItem(description, wines) : null;
        const match = matchWarehouseItem(description, stockItems);
        const category =
          match?.category ??
          (isCantina && suggestedCategory === "Dispensa" ? "Vini" : suggestedCategory);

        return {
          lineOrder: idx + 1,
          description,
          quantity: l.quantity ?? 1,
          unit: l.unit ?? "pz",
          unitPrice: l.unitPrice,
          vatPct: null as number | null,
          discountPct: null as number | null,
          lineTotal: l.totalPrice,
          lotNumber: l.lotNumber,
          expiryDate: parseDate(l.expiryDate),
          suggestedCategory: category,
          selectedCategory: category,
          warehouseLocation: defaultWarehouseLocation,
          warehouseItemId: match?.id ?? null,
          wineCellarItemId: wineMatch?.id ?? null,
          matchStatus: wineMatch || match ? "matched" : "new",
        };
      }),
    );

    const matchedCount = mappedLines.filter((l) => l.matchStatus === "matched").length;
    const newCount = mappedLines.length - matchedCount;

    await warehouseBollaImportRepository.replaceLines(tenantId, importId, mappedLines);
    await warehouseBollaImportRepository.updateProgress(tenantId, importId, {
      status: "review",
      currentStep: "Revisione",
      progressPct: 90,
      lineCount: mappedLines.length,
      matchedCount,
      newCount,
      completedAt: new Date(),
      durationMs: Date.now() - t0,
    });

    await warehouseBollaImportRepository.addAudit(tenantId, importId, "ocr_completed", {
      lineCount: mappedLines.length,
      confidence: vision.analysis.confidence,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore elaborazione bolla";
    await warehouseBollaImportRepository.updateProgress(tenantId, importId, {
      status: "failed",
      currentStep: "Errore OCR",
      progressPct: 100,
      errorMessage: message,
      completedAt: new Date(),
      durationMs: Date.now() - t0,
    });
    await warehouseBollaImportRepository.addAudit(tenantId, importId, "failed", { error: message });
  }
}

