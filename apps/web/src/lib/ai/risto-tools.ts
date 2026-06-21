import { prisma } from "@/lib/db/prisma";
import {
  buildBriefingNarrative,
  operationalBriefingRepository,
} from "@/lib/db/repositories/operational-briefing.repository";

/**
 * OpenAI function/tool definitions for "Risto" — the voice-operated AI assistant.
 * Each tool maps to a real DB operation the AI can execute on behalf of the user.
 */

export const RISTO_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_recipe",
      description:
        "Crea una nuova ricetta con ingredienti e passaggi. Usala quando l'utente dice 'crea ricetta', 'nuova ricetta', 'inserisci ricetta'.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome della ricetta" },
          category: { type: "string", description: "Categoria (Primi, Secondi, Pizze, Dolci, Contorni, Antipasti)" },
          area: { type: "string", description: "Area di produzione (cucina, pizzeria, bar)", default: "cucina" },
          sellingPrice: { type: "number", description: "Prezzo di vendita in euro" },
          portions: { type: "number", description: "Numero di porzioni dalla ricetta", default: 1 },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Nome ingrediente" },
                qty: { type: "number", description: "Quantità" },
                unit: { type: "string", description: "Unità di misura (kg, g, L, ml, pz)" },
                unitCost: { type: "number", description: "Costo unitario in euro (se noto)" },
              },
              required: ["name", "qty", "unit"],
            },
          },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                stepOrder: { type: "number" },
                text: { type: "string", description: "Descrizione del passaggio" },
              },
              required: ["stepOrder", "text"],
            },
          },
          notes: { type: "string", description: "Note aggiuntive sulla ricetta" },
        },
        required: ["name", "category", "sellingPrice"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_stock",
      description:
        "Aggiorna la giacenza di un prodotto in magazzino. Usala per 'carica', 'scarica', 'segna X kg di...', 'registra bolla', 'aggiorna scorte'.",
      parameters: {
        type: "object",
        properties: {
          productName: { type: "string", description: "Nome del prodotto da cercare in magazzino" },
          qty: { type: "number", description: "Quantità da aggiungere (positivo) o rimuovere (negativo)" },
          reason: { type: "string", description: "Motivo del movimento (bolla, consumo, correzione, scarico)", default: "aggiornamento manuale" },
        },
        required: ["productName", "qty"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_stock",
      description:
        "Cerca prodotti in magazzino per nome. Usala per 'quanta farina abbiamo?', 'controllo scorte', 'cerca prodotto'.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termine di ricerca" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_menu_item",
      description:
        "Aggiunge un piatto al menu. Usala per 'aggiungi piatto al menu', 'inserisci nel menu', 'nuovo piatto'.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome del piatto" },
          category: { type: "string", description: "Categoria (Primi, Secondi, Pizze, ecc.)" },
          area: { type: "string", description: "Area (Cucina, Pizzeria, Bar)" },
          price: { type: "number", description: "Prezzo in euro" },
          recipeId: { type: "string", description: "ID ricetta collegata (se nota)" },
          notes: { type: "string", description: "Note e allergeni" },
        },
        required: ["name", "category", "price"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_wine",
      description:
        "Aggiunge un vino alla cantina. Usala per 'aggiungi vino', 'inserisci in cantina', 'nuovo vino'.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome del vino" },
          producer: { type: "string", description: "Casa produttrice" },
          country: { type: "string", description: "Paese d'origine", default: "Italia" },
          region: { type: "string", description: "Regione" },
          color: { type: "string", enum: ["rosso", "bianco", "rosé", "bollicine", "passito", "orange"], description: "Colore del vino" },
          body: { type: "string", enum: ["leggero", "medio", "corposo", "forte", "dolce", "secco"] },
          grapeVariety: { type: "string", description: "Vitigno/i" },
          alcoholPct: { type: "number", description: "Gradazione alcolica" },
          vintageYear: { type: "number", description: "Annata" },
          purchasePrice: { type: "number", description: "Prezzo acquisto" },
          sellingPrice: { type: "number", description: "Prezzo vendita" },
          stock: { type: "number", description: "Numero bottiglie" },
          pairings: { type: "string", description: "Abbinamenti consigliati" },
        },
        required: ["name", "color", "sellingPrice"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_wine_stock",
      description:
        "Aggiorna la giacenza di un vino in cantina. Usala per 'carica bottiglie', 'scarica vino', 'aggiorna stock vino'.",
      parameters: {
        type: "object",
        properties: {
          wineName: { type: "string", description: "Nome del vino da cercare" },
          qty: { type: "number", description: "Bottiglie da aggiungere (positivo) o rimuovere (negativo)" },
        },
        required: ["wineName", "qty"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "prepare_supplier_order",
      description:
        "Prepara una lista ordine fornitore basata sulle scorte sotto minimo. Usala per 'prepara ordine', 'lista riordino', 'cosa devo ordinare'.",
      parameters: {
        type: "object",
        properties: {
          supplierName: { type: "string", description: "Nome fornitore (opzionale, se vuoto mostra tutti)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_operational_briefing",
      description:
        "Restituisce il briefing operativo completo della giornata: prenotazioni, staff presente, comande attive, prodotti da preparare, magazzino sotto scorta, ordini fornitore in attesa, notifiche e cose da fare. Usala per 'dammi la situazione', 'situazione attuale', 'cosa devo fare oggi', 'briefing del giorno', 'riepilogo completo'.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_daily_summary",
      description:
        "Restituisce un riepilogo sintetico del giorno: ordini, incassi, scorte critiche. Usala per 'come stiamo?', 'riepilogo veloce', 'stato ristorante'. Per un briefing completo preferisci get_operational_briefing.",
      parameters: {
        type: "object",
        properties: {
          area: { type: "string", description: "Area specifica (cucina, sala, bar) o 'tutti'" },
        },
      },
    },
  },
];

type ToolResult = { success: boolean; message: string; data?: unknown };

export async function executeRistoTool(
  toolName: string,
  args: Record<string, unknown>,
  tenantId: string,
): Promise<ToolResult> {
  switch (toolName) {
    case "create_recipe":
      return createRecipe(args, tenantId);
    case "update_stock":
      return updateStock(args, tenantId);
    case "search_stock":
      return searchStock(args, tenantId);
    case "add_menu_item":
      return addMenuItem(args, tenantId);
    case "add_wine":
      return addWine(args, tenantId);
    case "update_wine_stock":
      return updateWineStock(args, tenantId);
    case "prepare_supplier_order":
      return prepareSupplierOrder(args, tenantId);
    case "get_operational_briefing":
      return getOperationalBriefing(tenantId);
    case "get_daily_summary":
      return getDailySummary(args, tenantId);
    default:
      return { success: false, message: `Tool sconosciuto: ${toolName}` };
  }
}

async function createRecipe(args: Record<string, unknown>, tenantId: string): Promise<ToolResult> {
  const name = String(args.name || "");
  if (!name) return { success: false, message: "Nome ricetta obbligatorio." };

  const validAreas = ["cucina", "bar", "pizzeria", "sala"] as const;
  const rawArea = String(args.area || "cucina").toLowerCase();
  const area = validAreas.includes(rawArea as (typeof validAreas)[number])
    ? (rawArea as (typeof validAreas)[number])
    : "cucina";

  const recipe = await prisma.recipe.create({
    data: {
      tenantId,
      name,
      category: String(args.category || "Primi"),
      area,
      portions: Number(args.portions) || 1,
      sellingPrice: Number(args.sellingPrice) || 0,
      targetFcPct: 30,
      ivaPct: 10,
      overheadPct: 8,
      packagingCost: 0,
      laborCost: 0,
      energyCost: 0,
      notes: String(args.notes || ""),
    },
  });

  const ingredients = Array.isArray(args.ingredients) ? args.ingredients : [];
  if (ingredients.length > 0) {
    await prisma.recipeIngredient.createMany({
      data: ingredients.map((ing: Record<string, unknown>) => ({
        recipeId: recipe.id,
        name: String(ing.name || ""),
        qty: Number(ing.qty) || 0,
        unit: String(ing.unit || "kg"),
        unitCost: Number(ing.unitCost) || 0,
        wastePct: 0,
      })),
    });
  }

  const steps = Array.isArray(args.steps) ? args.steps : [];
  if (steps.length > 0) {
    await prisma.recipeStep.createMany({
      data: steps.map((s: Record<string, unknown>) => ({
        recipeId: recipe.id,
        stepOrder: Number(s.stepOrder) || 1,
        text: String(s.text || ""),
      })),
    });
  }

  return {
    success: true,
    message: `Ricetta "${name}" creata con ${ingredients.length} ingredienti e ${steps.length} passaggi. Prezzo: €${Number(args.sellingPrice || 0).toFixed(2)}.`,
    data: { recipeId: recipe.id, name },
  };
}

async function updateStock(args: Record<string, unknown>, tenantId: string): Promise<ToolResult> {
  const productName = String(args.productName || "");
  const qty = Number(args.qty) || 0;
  if (!productName) return { success: false, message: "Nome prodotto obbligatorio." };
  if (qty === 0) return { success: false, message: "Quantità deve essere diversa da zero." };

  const item = await prisma.warehouseItem.findFirst({
    where: {
      tenantId,
      name: { contains: productName, mode: "insensitive" },
    },
  });

  if (!item) {
    return { success: false, message: `Prodotto "${productName}" non trovato in magazzino. Verifica il nome.` };
  }

  const currentQty = Number(item.qty);
  const newQty = Math.max(0, currentQty + qty);
  await prisma.warehouseItem.update({
    where: { id: item.id },
    data: { qty: newQty },
  });

  await prisma.warehouseMovement.create({
    data: {
      tenantId,
      warehouseItemId: item.id,
      date: new Date(),
      type: qty > 0 ? "carico" : "scarico",
      qty: Math.abs(qty),
      unit: item.unit,
      reason: String(args.reason || "comando vocale Risto"),
    },
  });

  const action = qty > 0 ? "caricati" : "scaricati";
  return {
    success: true,
    message: `${Math.abs(qty)} ${item.unit} di "${item.name}" ${action}. Giacenza attuale: ${newQty} ${item.unit}.`,
    data: { itemId: item.id, name: item.name, previousQty: currentQty, newQty },
  };
}

async function searchStock(args: Record<string, unknown>, tenantId: string): Promise<ToolResult> {
  const query = String(args.query || "");
  const items = await prisma.warehouseItem.findMany({
    where: {
      tenantId,
      name: { contains: query, mode: "insensitive" },
    },
    take: 10,
    orderBy: { name: "asc" },
  });

  if (items.length === 0) {
    return { success: true, message: `Nessun prodotto trovato per "${query}".`, data: [] };
  }

  const lines = items.map((i) => {
    const q = Number(i.qty);
    const m = Number(i.minStock);
    return `• ${i.name}: ${q} ${i.unit} (min: ${m}) ${q < m ? "⚠️ SOTTO SCORTA" : "✅"}`;
  });

  return {
    success: true,
    message: `Trovati ${items.length} prodotti:\n${lines.join("\n")}`,
    data: items.map((i) => ({ id: i.id, name: i.name, qty: Number(i.qty), unit: i.unit, minStock: Number(i.minStock) })),
  };
}

async function addMenuItem(args: Record<string, unknown>, tenantId: string): Promise<ToolResult> {
  const name = String(args.name || "");
  if (!name) return { success: false, message: "Nome piatto obbligatorio." };

  const item = await prisma.menuItem.create({
    data: {
      tenantId,
      name,
      category: String(args.category || ""),
      area: String(args.area || "Cucina"),
      price: Number(args.price) || 0,
      code: "",
      active: true,
      recipeId: args.recipeId ? String(args.recipeId) : null,
      notes: String(args.notes || ""),
      foodCostPct: null,
    },
  });

  return {
    success: true,
    message: `Piatto "${name}" aggiunto al menu a €${Number(args.price || 0).toFixed(2)} nell'area ${args.area || "Cucina"}.`,
    data: { menuItemId: item.id },
  };
}

async function addWine(args: Record<string, unknown>, tenantId: string): Promise<ToolResult> {
  const name = String(args.name || "");
  if (!name) return { success: false, message: "Nome vino obbligatorio." };

  const wine = await prisma.wineCellarItem.create({
    data: {
      tenantId,
      name,
      producer: String(args.producer || ""),
      country: String(args.country || "Italia"),
      region: String(args.region || ""),
      color: String(args.color || "rosso"),
      body: String(args.body || "medio"),
      grapeVariety: String(args.grapeVariety || ""),
      alcoholPct: Number(args.alcoholPct) || 0,
      vintageYear: args.vintageYear ? Number(args.vintageYear) : null,
      bottlingYear: null,
      pairings: String(args.pairings || ""),
      purchasePrice: Number(args.purchasePrice) || 0,
      sellingPrice: Number(args.sellingPrice) || 0,
      showPurchasePrice: false,
      stock: Number(args.stock) || 0,
      notes: "",
    },
  });

  return {
    success: true,
    message: `Vino "${name}" aggiunto alla cantina. Prezzo: €${Number(args.sellingPrice || 0).toFixed(2)}, ${Number(args.stock || 0)} bottiglie.`,
    data: { wineId: wine.id },
  };
}

async function updateWineStock(args: Record<string, unknown>, tenantId: string): Promise<ToolResult> {
  const wineName = String(args.wineName || "");
  const qty = Number(args.qty) || 0;
  if (!wineName) return { success: false, message: "Nome vino obbligatorio." };

  const wine = await prisma.wineCellarItem.findFirst({
    where: {
      tenantId,
      name: { contains: wineName, mode: "insensitive" },
    },
  });

  if (!wine) return { success: false, message: `Vino "${wineName}" non trovato in cantina.` };

  const newStock = Math.max(0, wine.stock + qty);
  await prisma.wineCellarItem.update({
    where: { id: wine.id },
    data: { stock: newStock },
  });

  const action = qty > 0 ? "aggiunte" : "rimosse";
  return {
    success: true,
    message: `${Math.abs(qty)} bottiglie di "${wine.name}" ${action}. Giacenza: ${newStock} bottiglie.`,
    data: { wineId: wine.id, previousStock: wine.stock, newStock },
  };
}

async function prepareSupplierOrder(args: Record<string, unknown>, tenantId: string): Promise<ToolResult> {
  const supplierFilter = String(args.supplierName || "");

  const where: Record<string, unknown> = { tenantId };
  if (supplierFilter) {
    where.supplier = { contains: supplierFilter, mode: "insensitive" };
  }

  const items = await prisma.warehouseItem.findMany({
    where: where as never,
    orderBy: { supplier: "asc" },
  });

  const lowStock = items.filter((i) => Number(i.qty) < Number(i.minStock));

  if (lowStock.length === 0) {
    return { success: true, message: "Nessun prodotto sotto scorta minima. Non serve un ordine.", data: [] };
  }

  const bySupplier: Record<string, typeof lowStock> = {};
  for (const item of lowStock) {
    const sup = item.supplier || "Senza fornitore";
    if (!bySupplier[sup]) bySupplier[sup] = [];
    bySupplier[sup].push(item);
  }

  const lines: string[] = [];
  for (const [supplier, prods] of Object.entries(bySupplier)) {
    lines.push(`\n📦 ${supplier}:`);
    for (const p of prods) {
      const toOrder = Number(p.minStock) - Number(p.qty);
      lines.push(`  • ${p.name}: ordinare ${toOrder} ${p.unit} (attuale: ${Number(p.qty)}, minimo: ${Number(p.minStock)})`);
    }
  }

  return {
    success: true,
    message: `${lowStock.length} prodotti da riordinare:${lines.join("\n")}`,
    data: lowStock.map((i) => ({ name: i.name, qty: Number(i.qty), minStock: Number(i.minStock), toOrder: Number(i.minStock) - Number(i.qty), supplier: i.supplier })),
  };
}

async function getOperationalBriefing(tenantId: string): Promise<ToolResult> {
  const briefing = await operationalBriefingRepository.build(tenantId);
  const narrative = buildBriefingNarrative(briefing);
  return {
    success: true,
    message: narrative,
    data: briefing,
  };
}

async function getDailySummary(_args: Record<string, unknown>, tenantId: string): Promise<ToolResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [orders, menuItems, warehouseItems, wines] = await Promise.all([
    prisma.restaurantOrder.findMany({
      where: { tenantId, createdAt: { gte: today } },
      include: { items: true },
    }),
    prisma.menuItem.count({ where: { tenantId, active: true } }),
    prisma.warehouseItem.findMany({ where: { tenantId } }),
    prisma.wineCellarItem.findMany({ where: { tenantId } }),
  ]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (s, o) => s + o.items.reduce((si, i) => si + Number(i.price ?? 0) * i.qty, 0),
    0,
  );
  const lowStockCount = warehouseItems.filter((i) => Number(i.qty) < Number(i.minStock)).length;
  const winesLowStock = wines.filter((w) => w.stock > 0 && w.stock <= 3).length;
  const winesOutOfStock = wines.filter((w) => w.stock === 0).length;

  const summary = [
    `📊 Riepilogo di oggi (${today.toLocaleDateString("it-IT")}):`,
    `• Comande: ${totalOrders}`,
    `• Incasso stimato: €${totalRevenue.toFixed(2)}`,
    `• Piatti attivi in menu: ${menuItems}`,
    `• Magazzino: ${warehouseItems.length} prodotti, ${lowStockCount} sotto scorta`,
    `• Cantina: ${wines.length} etichette, ${winesLowStock} scorte basse, ${winesOutOfStock} esauriti`,
  ];

  return {
    success: true,
    message: summary.join("\n"),
    data: { totalOrders, totalRevenue, menuItems, lowStockCount, winesLowStock, winesOutOfStock },
  };
}
