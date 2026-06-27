import type {
  VisionIntegrationModule,
  VisionIntegrationPayload,
  VisionRawAnalysis,
  VisionTaskType,
} from "@/lib/ai/vision/types";
import { TASK_INTEGRATIONS } from "@/lib/ai/vision/types";

function inventoryFromDocument(analysis: VisionRawAnalysis, docType: string): VisionIntegrationPayload {
  const lines = analysis.document?.lineItems ?? [];
  return {
    module: "inventory",
    action: "suggest_goods_receipt",
    priority: analysis.confidenceLevel === "high" ? "high" : "medium",
    data: {
      documentType: docType,
      supplierName: analysis.document?.supplierName,
      documentNumber: analysis.document?.documentNumber,
      documentDate: analysis.document?.documentDate,
      items: lines.map((l) => ({
        name: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unitCost: l.unitPrice,
        lotNumber: l.lotNumber,
        expiryDate: l.expiryDate,
        sku: l.sku,
      })),
      note: "Suggerimento Vision AI — verificare prima di registrare a magazzino",
    },
  };
}

function foodcostFromDocument(analysis: VisionRawAnalysis): VisionIntegrationPayload {
  const lines = analysis.document?.lineItems ?? [];
  return {
    module: "foodcost",
    action: "suggest_ingredient_costs",
    priority: "medium",
    data: {
      ingredientCosts: lines
        .filter((l) => l.unitPrice != null)
        .map((l) => ({
          name: l.description,
          unitCost: l.unitPrice,
          unit: l.unit,
        })),
      note: "Aggiornare costi ricette dopo verifica",
    },
  };
}

function inventoryFromProducts(analysis: VisionRawAnalysis): VisionIntegrationPayload {
  return {
    module: "inventory",
    action: "suggest_stock_identification",
    priority: "medium",
    data: {
      products: (analysis.products ?? []).map((p) => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        quantity: p.quantity,
        unit: p.unit,
        barcode: p.barcode,
        lotNumber: p.lotNumber,
        expiryDate: p.expiryDate,
      })),
    },
  };
}

function foodcostFromProducts(analysis: VisionRawAnalysis): VisionIntegrationPayload {
  return {
    module: "foodcost",
    action: "suggest_recipe_ingredients",
    priority: "low",
    data: {
      ingredients: (analysis.products ?? []).map((p) => ({
        name: p.name,
        allergens: p.allergens,
        category: p.category,
      })),
    },
  };
}

function cantinaFromProducts(analysis: VisionRawAnalysis): VisionIntegrationPayload {
  const wines = (analysis.products ?? []).filter(
    (p) =>
      p.category?.toLowerCase().includes("vino") ||
      p.name?.toLowerCase().includes("vino") ||
      p.category?.toLowerCase().includes("wine"),
  );
  if (wines.length === 0) {
    return {
      module: "cantina",
      action: "no_wine_detected",
      priority: "low",
      data: { products: analysis.products ?? [] },
    };
  }
  return {
    module: "cantina",
    action: "suggest_wine_catalog_entry",
    priority: "medium",
    data: {
      wines: wines.map((w) => ({
        name: w.name,
        brand: w.brand,
        lotNumber: w.lotNumber,
      })),
    },
  };
}

function hotelFromProducts(analysis: VisionRawAnalysis): VisionIntegrationPayload {
  return {
    module: "hotel",
    action: "suggest_minibar_or_amenity_stock",
    priority: "low",
    data: {
      products: (analysis.products ?? []).map((p) => ({
        name: p.name,
        category: p.category,
        quantity: p.quantity,
      })),
      note: "Per minibar, amenities camere o room service",
    },
  };
}

function crmFromAllergens(analysis: VisionRawAnalysis): VisionIntegrationPayload {
  const allergens = new Set<string>();
  for (const p of analysis.products ?? []) {
    for (const a of p.allergens) allergens.add(a);
  }
  for (const m of analysis.menuItems ?? []) {
    for (const a of m.allergens) allergens.add(a);
  }
  return {
    module: "crm",
    action: "suggest_allergen_profile",
    priority: allergens.size > 0 ? "high" : "low",
    data: {
      detectedAllergens: [...allergens],
      note: "Associare a profilo cliente se rilevante",
    },
  };
}

function foodcostFromMenu(analysis: VisionRawAnalysis): VisionIntegrationPayload {
  return {
    module: "foodcost",
    action: "suggest_menu_import",
    priority: "medium",
    data: {
      items: (analysis.menuItems ?? []).map((m) => ({
        name: m.name,
        category: m.category,
        price: m.price,
        currency: m.currency,
        allergens: m.allergens,
      })),
      note: "Importare in menu dopo revisione prezzi e categorie",
    },
  };
}

function foodcostFromPlating(analysis: VisionRawAnalysis): VisionIntegrationPayload {
  return {
    module: "foodcost",
    action: "suggest_plating_review",
    priority: analysis.plating?.presentationScore != null && analysis.plating.presentationScore < 6 ? "high" : "low",
    data: {
      dishName: analysis.plating?.dishName,
      presentationScore: analysis.plating?.presentationScore,
      portionConsistency: analysis.plating?.portionConsistency,
      issues: analysis.plating?.issues ?? [],
      suggestions: analysis.plating?.suggestions ?? [],
    },
  };
}

function inventoryFromHaccp(analysis: VisionRawAnalysis): VisionIntegrationPayload {
  return {
    module: "inventory",
    action: "suggest_haccp_followup",
    priority: analysis.haccp?.riskLevel === "high" ? "high" : "medium",
    data: {
      checkType: analysis.haccp?.checkType,
      location: analysis.haccp?.location,
      temperatureC: analysis.haccp?.temperatureC,
      visualConformity: analysis.haccp?.visualConformity,
      hygieneIssues: analysis.haccp?.hygieneIssues ?? [],
      correctiveActions: analysis.haccp?.correctiveActions ?? [],
      riskLevel: analysis.haccp?.riskLevel,
      note: "Registrare anche in modulo HACCP del gestionale",
    },
  };
}

const EXTRACTORS: Record<
  VisionTaskType,
  (analysis: VisionRawAnalysis) => VisionIntegrationPayload[]
> = {
  invoice: (a) => [inventoryFromDocument(a, "invoice"), foodcostFromDocument(a)],
  ddt: (a) => [inventoryFromDocument(a, "ddt")],
  supplier_price_list: (a) => [inventoryFromDocument(a, "supplier_price_list"), foodcostFromDocument(a)],
  product_recognition: (a) => [
    inventoryFromProducts(a),
    foodcostFromProducts(a),
    cantinaFromProducts(a),
    hotelFromProducts(a),
    crmFromAllergens(a),
  ],
  label_recognition: (a) => [
    inventoryFromProducts(a),
    foodcostFromProducts(a),
    crmFromAllergens(a),
  ],
  paper_menu: (a) => [foodcostFromMenu(a), crmFromAllergens(a)],
  plating_verification: (a) => [foodcostFromPlating(a)],
  haccp_photo: (a) => [inventoryFromHaccp(a)],
};

export function extractIntegrations(analysis: VisionRawAnalysis): VisionIntegrationPayload[] {
  const allowed = new Set<VisionIntegrationModule>(TASK_INTEGRATIONS[analysis.taskType]);
  const payloads = EXTRACTORS[analysis.taskType](analysis);
  return payloads.filter((p) => allowed.has(p.module));
}

export { EXTRACTORS };
