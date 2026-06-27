import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseVisionResponse } from "@/lib/ai/vision/parser";
import { extractIntegrations } from "@/lib/ai/vision/extractor";
import {
  isVisionTaskType,
  validateAnalyzeRequest,
  validateVisionAnalysis,
} from "@/lib/ai/vision/validator";
import { normalizeImageUrl } from "@/lib/ai/vision/provider";

const SAMPLE_INVOICE = JSON.stringify({
  confidence: 0.91,
  summary: "Fattura fornitore alimentari",
  warnings: [],
  document: {
    supplierName: "Alimentari Rossi Srl",
    documentNumber: "FT-2026-001",
    documentDate: "2026-06-01",
    totalAmount: 450.5,
    currency: "EUR",
    taxAmount: 81.09,
    notes: null,
    lineItems: [
      {
        description: "Farina tipo 00",
        quantity: 25,
        unit: "kg",
        unitPrice: 1.2,
        totalPrice: 30,
        sku: "FAR-00",
        lotNumber: "L2026A",
        expiryDate: "2026-12-01",
      },
    ],
  },
});

describe("vision parser", () => {
  it("parses invoice JSON", () => {
    const analysis = parseVisionResponse("invoice", SAMPLE_INVOICE);
    expect(analysis.confidence).toBe(0.91);
    expect(analysis.confidenceLevel).toBe("high");
    expect(analysis.document?.supplierName).toBe("Alimentari Rossi Srl");
    expect(analysis.document?.lineItems).toHaveLength(1);
    expect(analysis.document?.lineItems?.[0].description).toBe("Farina tipo 00");
  });

  it("handles invalid JSON gracefully", () => {
    const analysis = parseVisionResponse("invoice", "not json");
    expect(analysis.confidence).toBe(0);
    expect(analysis.warnings.length).toBeGreaterThan(0);
  });
});

describe("vision validator", () => {
  it("validates task types", () => {
    expect(isVisionTaskType("invoice")).toBe(true);
    expect(isVisionTaskType("unknown")).toBe(false);
  });

  it("validates analyze request", () => {
    expect(validateAnalyzeRequest({ taskType: "ddt", image: "abc" }).valid).toBe(true);
    expect(validateAnalyzeRequest({ taskType: "bad", image: "abc" }).valid).toBe(false);
    expect(validateAnalyzeRequest({ taskType: "ddt" }).valid).toBe(false);
  });

  it("validates parsed invoice analysis", () => {
    const analysis = parseVisionResponse("invoice", SAMPLE_INVOICE);
    const result = validateVisionAnalysis(analysis);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("vision extractor", () => {
  it("extracts inventory and foodcost integrations from invoice", () => {
    const analysis = parseVisionResponse("invoice", SAMPLE_INVOICE);
    const integrations = extractIntegrations(analysis);
    const modules = integrations.map((i) => i.module);
    expect(modules).toContain("inventory");
    expect(modules).toContain("foodcost");
    expect(integrations.find((i) => i.module === "inventory")?.action).toBe("suggest_goods_receipt");
  });

  it("extracts foodcost from paper menu", () => {
    const analysis = parseVisionResponse(
      "paper_menu",
      JSON.stringify({
        confidence: 0.8,
        summary: "Menu",
        warnings: [],
        menuItems: [{ name: "Carbonara", category: "Primi", price: 14, currency: "EUR", allergens: ["glutine"], description: null }],
      }),
    );
    const integrations = extractIntegrations(analysis);
    expect(integrations.some((i) => i.module === "foodcost")).toBe(true);
  });

  it("extracts haccp integration from photo", () => {
    const analysis = parseVisionResponse(
      "haccp_photo",
      JSON.stringify({
        confidence: 0.7,
        summary: "Controllo frigo",
        warnings: [],
        haccp: {
          checkType: "temp_frigo",
          location: "Cucina",
          temperatureC: 3,
          visualConformity: true,
          hygieneIssues: [],
          correctiveActions: [],
          riskLevel: "low",
        },
      }),
    );
    const integrations = extractIntegrations(analysis);
    expect(integrations[0].module).toBe("inventory");
    expect(integrations[0].action).toBe("suggest_haccp_followup");
  });
});

describe("vision provider", () => {
  it("normalizes raw base64 to data URL", () => {
    const { url, mimeType } = normalizeImageUrl({ image: "abc123", mimeType: "image/png" });
    expect(url).toBe("data:image/png;base64,abc123");
    expect(mimeType).toBe("image/png");
  });

  it("passes through data URL unchanged", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/abc";
    const { url } = normalizeImageUrl({ image: dataUrl });
    expect(url).toBe(dataUrl);
  });
});

describe("vision service", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "");
  });

  it("returns fallback when API key missing", async () => {
    const { analyzeVisionImage } = await import("@/lib/ai/vision/service");
    const result = await analyzeVisionImage({
      tenantId: "tenant-1",
      request: { taskType: "invoice", image: "abc123" },
    });
    expect(result.source).toBe("fallback");
    expect(result.valid).toBe(false);
    expect(result.integrations).toHaveLength(0);
  });
});

describe("vision task coverage", () => {
  it("covers all 8 task types in registry", async () => {
    const { VISION_TASK_TYPES, TASK_LABELS, TASK_INTEGRATIONS } = await import("@/lib/ai/vision/types");
    expect(VISION_TASK_TYPES).toHaveLength(8);
    for (const t of VISION_TASK_TYPES) {
      expect(TASK_LABELS[t]).toBeTruthy();
      expect(TASK_INTEGRATIONS[t].length).toBeGreaterThan(0);
    }
  });
});
