import type { VisionRawAnalysis, VisionTaskType } from "@/lib/ai/vision/types";

function confidenceLevel(score: number): "low" | "medium" | "high" {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function parseLineItems(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      description: asString(o.description) ?? "Articolo non identificato",
      quantity: asNumber(o.quantity),
      unit: asString(o.unit),
      unitPrice: asNumber(o.unitPrice),
      totalPrice: asNumber(o.totalPrice),
      sku: asString(o.sku),
      lotNumber: asString(o.lotNumber),
      expiryDate: asString(o.expiryDate),
    };
  });
}

function parseProducts(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      name: asString(o.name),
      brand: asString(o.brand),
      category: asString(o.category),
      quantity: asNumber(o.quantity),
      unit: asString(o.unit),
      barcode: asString(o.barcode),
      allergens: asStringArray(o.allergens),
      ingredients: asStringArray(o.ingredients),
      expiryDate: asString(o.expiryDate),
      lotNumber: asString(o.lotNumber),
      storageInstructions: asString(o.storageInstructions),
    };
  });
}

function parseMenuItems(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      name: asString(o.name) ?? "Piatto non identificato",
      category: asString(o.category),
      price: asNumber(o.price),
      currency: asString(o.currency) ?? "EUR",
      description: asString(o.description),
      allergens: asStringArray(o.allergens),
    };
  });
}

export function parseVisionResponse(taskType: VisionTaskType, rawContent: string): VisionRawAnalysis {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawContent) as Record<string, unknown>;
  } catch {
    return {
      taskType,
      confidence: 0,
      confidenceLevel: "low",
      summary: "Impossibile interpretare la risposta Vision AI",
      warnings: ["JSON non valido dalla risposta OpenAI"],
    };
  }

  const confidence = Math.min(1, Math.max(0, asNumber(parsed.confidence) ?? 0.5));

  const analysis: VisionRawAnalysis = {
    taskType,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    summary: asString(parsed.summary) ?? "Analisi completata",
    warnings: asStringArray(parsed.warnings),
  };

  if (parsed.document && typeof parsed.document === "object") {
    const doc = parsed.document as Record<string, unknown>;
    analysis.document = {
      supplierName: asString(doc.supplierName),
      documentNumber: asString(doc.documentNumber),
      documentDate: asString(doc.documentDate),
      totalAmount: asNumber(doc.totalAmount),
      currency: asString(doc.currency) ?? "EUR",
      taxAmount: asNumber(doc.taxAmount),
      notes: asString(doc.notes),
      lineItems: parseLineItems(doc.lineItems),
    };
  }

  if (parsed.products) {
    analysis.products = parseProducts(parsed.products);
  }

  if (parsed.menuItems) {
    analysis.menuItems = parseMenuItems(parsed.menuItems);
  }

  if (parsed.plating && typeof parsed.plating === "object") {
    const p = parsed.plating as Record<string, unknown>;
    const portion = asString(p.portionConsistency);
    analysis.plating = {
      dishName: asString(p.dishName),
      presentationScore: asNumber(p.presentationScore),
      portionConsistency:
        portion === "ok" || portion === "under" || portion === "over" ? portion : "unknown",
      garnishPresent: typeof p.garnishPresent === "boolean" ? p.garnishPresent : null,
      cleanlinessScore: asNumber(p.cleanlinessScore),
      issues: asStringArray(p.issues),
      suggestions: asStringArray(p.suggestions),
    };
  }

  if (parsed.haccp && typeof parsed.haccp === "object") {
    const h = parsed.haccp as Record<string, unknown>;
    const risk = asString(h.riskLevel);
    analysis.haccp = {
      checkType: asString(h.checkType),
      location: asString(h.location),
      temperatureC: asNumber(h.temperatureC),
      visualConformity: typeof h.visualConformity === "boolean" ? h.visualConformity : null,
      hygieneIssues: asStringArray(h.hygieneIssues),
      correctiveActions: asStringArray(h.correctiveActions),
      riskLevel:
        risk === "low" || risk === "medium" || risk === "high" ? risk : "unknown",
    };
  }

  return analysis;
}

export function parseVisionResponseSafe(
  taskType: VisionTaskType,
  rawContent: string,
): { analysis: VisionRawAnalysis; parseError: string | null } {
  try {
    return { analysis: parseVisionResponse(taskType, rawContent), parseError: null };
  } catch (e) {
    return {
      analysis: {
        taskType,
        confidence: 0,
        confidenceLevel: "low",
        summary: "Errore parsing risposta Vision",
        warnings: [e instanceof Error ? e.message : "Errore parsing"],
      },
      parseError: e instanceof Error ? e.message : "Errore parsing",
    };
  }
}
