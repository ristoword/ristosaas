import { prisma } from "@/lib/db/prisma";

export type CantinaAiSnapshot = {
  generatedAt: string;
  kpi: {
    totalLabels: number;
    totalStock: number;
    totalStockValue: number;
    avgMarginPct: number;
    lowStockCount: number;
    outOfStockCount: number;
    highMarginCount: number;
    lowMarginCount: number;
    oldVintageCount: number;
  };
  lowStockAlerts: Array<{
    id: string;
    name: string;
    producer: string;
    stock: number;
    sellingPrice: number;
    suggestion: string;
  }>;
  outOfStock: Array<{
    id: string;
    name: string;
    producer: string;
    sellingPrice: number;
    suggestion: string;
  }>;
  marginAnalysis: Array<{
    id: string;
    name: string;
    producer: string;
    purchasePrice: number;
    sellingPrice: number;
    marginPct: number;
    status: "excellent" | "good" | "low" | "loss";
    suggestion: string;
  }>;
  pricingSuggestions: Array<{
    id: string;
    name: string;
    currentPrice: number;
    suggestedPrice: number;
    reason: string;
  }>;
  salesRecommendations: Array<{
    id: string;
    name: string;
    producer: string;
    reason: string;
    priority: "high" | "medium" | "low";
  }>;
  vintageAlerts: Array<{
    id: string;
    name: string;
    vintageYear: number;
    age: number;
    suggestion: string;
  }>;
  colorDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
};

type DecimalLike = { toNumber: () => number };

const LOW_STOCK_THRESHOLD = 3;
const OLD_VINTAGE_YEARS = 8;
const LOW_MARGIN_PCT = 25;
const EXCELLENT_MARGIN_PCT = 60;

export const aiCantinaRepository = {
  async snapshot(tenantId: string): Promise<CantinaAiSnapshot> {
    const wines = await prisma.wineCellarItem.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    const currentYear = new Date().getFullYear();

    const mapped = wines.map((w) => ({
      id: w.id,
      name: w.name,
      producer: w.producer,
      country: w.country,
      region: w.region,
      color: w.color,
      body: w.body,
      grapeVariety: w.grapeVariety,
      alcoholPct: (w.alcoholPct as unknown as DecimalLike).toNumber(),
      vintageYear: w.vintageYear,
      bottlingYear: w.bottlingYear,
      purchasePrice: (w.purchasePrice as unknown as DecimalLike).toNumber(),
      sellingPrice: (w.sellingPrice as unknown as DecimalLike).toNumber(),
      stock: w.stock,
      pairings: w.pairings,
    }));

    const totalLabels = mapped.length;
    const totalStock = mapped.reduce((s, w) => s + w.stock, 0);
    const totalStockValue = mapped.reduce((s, w) => s + w.stock * w.sellingPrice, 0);

    const marginsValid = mapped.filter((w) => w.sellingPrice > 0 && w.purchasePrice > 0);
    const margins = marginsValid.map((w) => ((w.sellingPrice - w.purchasePrice) / w.sellingPrice) * 100);
    const avgMarginPct = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

    const lowStockWines = mapped.filter((w) => w.stock > 0 && w.stock <= LOW_STOCK_THRESHOLD);
    const outOfStockWines = mapped.filter((w) => w.stock === 0);
    const highMarginWines = marginsValid.filter((w) => ((w.sellingPrice - w.purchasePrice) / w.sellingPrice) * 100 >= EXCELLENT_MARGIN_PCT);
    const lowMarginWines = marginsValid.filter((w) => ((w.sellingPrice - w.purchasePrice) / w.sellingPrice) * 100 < LOW_MARGIN_PCT);
    const oldVintageWines = mapped.filter((w) => w.vintageYear && currentYear - w.vintageYear >= OLD_VINTAGE_YEARS);

    const lowStockAlerts = lowStockWines.map((w) => ({
      id: w.id,
      name: w.name,
      producer: w.producer,
      stock: w.stock,
      sellingPrice: w.sellingPrice,
      suggestion: w.stock === 1
        ? `Ultima bottiglia! Riordinare urgentemente "${w.name}" di ${w.producer || "produttore sconosciuto"}.`
        : `Solo ${w.stock} bottiglie rimaste. Valutare il riordino.`,
    }));

    const outOfStock = outOfStockWines.map((w) => ({
      id: w.id,
      name: w.name,
      producer: w.producer,
      sellingPrice: w.sellingPrice,
      suggestion: w.sellingPrice > 30
        ? `Vino premium esaurito — riordinare o rimuovere dalla carta.`
        : `Esaurito. Verificare se mantenere in carta o sostituire.`,
    }));

    const marginAnalysis = marginsValid
      .map((w) => {
        const m = ((w.sellingPrice - w.purchasePrice) / w.sellingPrice) * 100;
        let status: "excellent" | "good" | "low" | "loss";
        let suggestion: string;
        if (m >= EXCELLENT_MARGIN_PCT) {
          status = "excellent";
          suggestion = "Margine eccellente. Considerare come vino di punta.";
        } else if (m >= 40) {
          status = "good";
          suggestion = "Margine buono. Nessuna azione necessaria.";
        } else if (m >= LOW_MARGIN_PCT) {
          status = "low";
          suggestion = `Margine basso (${m.toFixed(0)}%). Valutare aumento prezzo o cambio fornitore.`;
        } else {
          status = "loss";
          suggestion = `Margine critico (${m.toFixed(0)}%). Aumentare il prezzo vendita o negoziare il prezzo d'acquisto.`;
        }
        return {
          id: w.id,
          name: w.name,
          producer: w.producer,
          purchasePrice: w.purchasePrice,
          sellingPrice: w.sellingPrice,
          marginPct: m,
          status,
          suggestion,
        };
      })
      .sort((a, b) => a.marginPct - b.marginPct);

    const pricingSuggestions = marginsValid
      .filter((w) => {
        const m = ((w.sellingPrice - w.purchasePrice) / w.sellingPrice) * 100;
        return m < 35 || m > 75;
      })
      .map((w) => {
        const m = ((w.sellingPrice - w.purchasePrice) / w.sellingPrice) * 100;
        const targetMargin = 0.50;
        const suggestedPrice = Math.ceil((w.purchasePrice / (1 - targetMargin)) * 2) / 2;
        return {
          id: w.id,
          name: w.name,
          currentPrice: w.sellingPrice,
          suggestedPrice,
          reason: m < 35
            ? `Margine troppo basso (${m.toFixed(0)}%). Prezzo suggerito: €${suggestedPrice.toFixed(2)} per un margine del 50%.`
            : `Margine molto alto (${m.toFixed(0)}%). Potresti abbassare il prezzo per aumentare le vendite.`,
        };
      });

    const salesRecommendations: CantinaAiSnapshot["salesRecommendations"] = [];

    for (const w of mapped) {
      if (w.vintageYear && currentYear - w.vintageYear >= OLD_VINTAGE_YEARS && w.stock > 0) {
        salesRecommendations.push({
          id: w.id,
          name: w.name,
          producer: w.producer,
          reason: `Annata ${w.vintageYear} (${currentYear - w.vintageYear} anni). Promuovere in carta come "selezione riserva" o valutare vendita al bicchiere.`,
          priority: "medium",
        });
      }

      if (w.stock > 12 && w.sellingPrice < 15) {
        salesRecommendations.push({
          id: w.id,
          name: w.name,
          producer: w.producer,
          reason: `Alta giacenza (${w.stock} bottiglie) con prezzo basso. Considerare come "vino della casa" o in promozione.`,
          priority: "low",
        });
      }

      if (w.stock <= 2 && w.stock > 0 && w.sellingPrice > 40) {
        salesRecommendations.push({
          id: w.id,
          name: w.name,
          producer: w.producer,
          reason: `Ultime ${w.stock} bottiglie di un vino premium (€${w.sellingPrice.toFixed(2)}). Proporre come selezione esclusiva del sommelier.`,
          priority: "high",
        });
      }
    }

    salesRecommendations.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    });

    const vintageAlerts = oldVintageWines
      .filter((w) => w.stock > 0)
      .map((w) => ({
        id: w.id,
        name: w.name,
        vintageYear: w.vintageYear!,
        age: currentYear - w.vintageYear!,
        suggestion: currentYear - w.vintageYear! >= 15
          ? `Annata molto vecchia (${w.vintageYear}). Verificare lo stato del vino e considerare una degustazione.`
          : `Vino maturo (${w.vintageYear}). Ideale da proporre ai clienti appassionati.`,
      }));

    const colorDistribution: Record<string, number> = {};
    const countryDistribution: Record<string, number> = {};
    for (const w of mapped) {
      colorDistribution[w.color] = (colorDistribution[w.color] ?? 0) + 1;
      if (w.country) {
        countryDistribution[w.country] = (countryDistribution[w.country] ?? 0) + 1;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      kpi: {
        totalLabels,
        totalStock,
        totalStockValue,
        avgMarginPct,
        lowStockCount: lowStockWines.length,
        outOfStockCount: outOfStockWines.length,
        highMarginCount: highMarginWines.length,
        lowMarginCount: lowMarginWines.length,
        oldVintageCount: oldVintageWines.length,
      },
      lowStockAlerts,
      outOfStock,
      marginAnalysis,
      pricingSuggestions,
      salesRecommendations,
      vintageAlerts,
      colorDistribution,
      countryDistribution,
    };
  },
};
