import { prisma } from "@/lib/db/prisma";
import type { EntitySyncDescriptor, KnowledgeModule } from "@/lib/ai/rag/types";

function money(n: unknown): string {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

/** Collect indexable text from operational entities (incremental sync sources). */
export async function collectTenantEntityDocuments(tenantId: string): Promise<EntitySyncDescriptor[]> {
  const docs: EntitySyncDescriptor[] = [];

  const [menuItems, recipes, haccp, staff, notes, folioAttachments] = await Promise.all([
    prisma.menuItem.findMany({
      where: { tenantId },
      include: { recipe: { include: { ingredients: true, steps: true } } },
      take: 500,
    }),
    prisma.recipe.findMany({
      where: { tenantId },
      include: { ingredients: true, steps: true },
      take: 500,
    }),
    prisma.haccpEntry.findMany({ where: { tenantId }, orderBy: { recordedAt: "desc" }, take: 300 }),
    prisma.staffMember.findMany({ where: { tenantId }, take: 200 }),
    prisma.operationalNote.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.folioAttachment.findMany({
      where: { tenantId, mimeType: { in: ["text/plain", "text/markdown", "application/json"] } },
      take: 100,
    }),
  ]);

  for (const item of menuItems) {
    const lines = [
      `Menu: ${item.name}`,
      `Categoria: ${item.category}`,
      `Area: ${item.area}`,
      `Prezzo: EUR ${money(item.price)}`,
      `Codice: ${item.code}`,
      item.notes ? `Note: ${item.notes}` : "",
      item.foodCostPct != null ? `Food cost %: ${money(item.foodCostPct)}` : "",
    ];
    if (item.recipe) {
      lines.push(`Ricetta collegata: ${item.recipe.name}`);
      for (const ing of item.recipe.ingredients) {
        lines.push(`- ${ing.name}: ${money(ing.qty)} ${ing.unit} @ EUR ${money(ing.unitCost)}`);
      }
      for (const step of item.recipe.steps) {
        lines.push(`Passo ${step.stepOrder}: ${step.text}`);
      }
    }
    docs.push({
      module: "menu",
      category: item.category || "menu",
      sourceEntity: "menu_item",
      sourceEntityId: item.id,
      title: `Menu — ${item.name}`,
      text: lines.filter(Boolean).join("\n"),
      metadata: { menuItemId: item.id, area: item.area },
    });
  }

  for (const recipe of recipes) {
    const ingLines = recipe.ingredients.map(
      (i) => `- ${i.name}: ${money(i.qty)} ${i.unit}, costo unit. EUR ${money(i.unitCost)}, scarto ${money(i.wastePct)}%`,
    );
    const stepLines = recipe.steps.map((s) => `${s.stepOrder}. ${s.text}`);
    docs.push({
      module: "recipes",
      category: recipe.category,
      sourceEntity: "recipe",
      sourceEntityId: recipe.id,
      title: `Ricetta — ${recipe.name}`,
      text: [
        `Ricetta: ${recipe.name}`,
        `Categoria: ${recipe.category}`,
        `Porzioni: ${recipe.portions}`,
        `Prezzo vendita: EUR ${money(recipe.sellingPrice)}`,
        `Food cost target: ${money(recipe.targetFcPct)}%`,
        `Note: ${recipe.notes || "—"}`,
        "Ingredienti:",
        ...ingLines,
        "Procedimento:",
        ...stepLines,
      ].join("\n"),
      metadata: { recipeId: recipe.id, area: recipe.area },
    });

    const fcText = [
      `Food Cost — ${recipe.name}`,
      `Costo confezione: EUR ${money(recipe.packagingCost)}`,
      `Costo manodopera: EUR ${money(recipe.laborCost)}`,
      `Costo energia: EUR ${money(recipe.energyCost)}`,
      `Overhead: ${money(recipe.overheadPct)}%`,
      `IVA: ${money(recipe.ivaPct)}%`,
    ].join("\n");
    docs.push({
      module: "food_cost",
      category: "food_cost",
      sourceEntity: "recipe",
      sourceEntityId: `${recipe.id}:fc`,
      title: `Food Cost — ${recipe.name}`,
      text: fcText,
      metadata: { recipeId: recipe.id },
    });
  }

  for (const entry of haccp) {
    docs.push({
      module: "haccp",
      category: entry.type,
      sourceEntity: "haccp_entry",
      sourceEntityId: entry.id,
      title: `HACCP — ${entry.type} ${entry.location || entry.product}`,
      text: [
        `HACCP tipo: ${entry.type}`,
        `Luogo: ${entry.location}`,
        entry.tempC != null ? `Temperatura: ${money(entry.tempC)}°C` : "",
        entry.thresholdMin != null || entry.thresholdMax != null
          ? `Soglie: ${entry.thresholdMin ?? "—"} / ${entry.thresholdMax ?? "—"}`
          : "",
        entry.conforme != null ? `Conforme: ${entry.conforme ? "sì" : "no"}` : "",
        entry.correctiveAction ? `Azione correttiva: ${entry.correctiveAction}` : "",
        entry.supplier ? `Fornitore: ${entry.supplier}` : "",
        entry.product ? `Prodotto: ${entry.product}` : "",
        entry.lotNumber ? `Lotto: ${entry.lotNumber}` : "",
        `Operatore: ${entry.operator}`,
        `Note: ${entry.notes || "—"}`,
        `Registrato: ${entry.recordedAt.toISOString()}`,
      ]
        .filter(Boolean)
        .join("\n"),
      metadata: { haccpId: entry.id },
    });
  }

  for (const member of staff) {
    docs.push({
      module: "staff_cost",
      category: "staff",
      sourceEntity: "staff_member",
      sourceEntityId: member.id,
      title: `Staff — ${member.name}`,
      text: [
        `Staff: ${member.name}`,
        `Ruolo: ${member.role}`,
        `Email: ${member.email || "—"}`,
        `Telefono: ${member.phone || "—"}`,
        `Stipendio: EUR ${money(member.salary)}`,
        `Ore settimanali: ${member.hoursWeek}`,
        `Stato: ${member.status}`,
        `Note: ${member.notes || "—"}`,
      ].join("\n"),
      metadata: { staffId: member.id },
    });
  }

  for (const note of notes) {
    docs.push({
      module: "operational_notes",
      category: note.area || "sop",
      sourceEntity: "operational_note",
      sourceEntityId: note.id,
      title: `Nota operativa — ${note.area}`,
      text: [`Area: ${note.area}`, note.text].join("\n\n"),
      metadata: { noteId: note.id },
    });
  }

  for (const att of folioAttachments) {
    if (!att.dataBase64) continue;
    try {
      const text = Buffer.from(att.dataBase64, "base64").toString("utf8").trim();
      if (!text) continue;
      docs.push({
        module: "guest_folio",
        category: "attachment",
        sourceEntity: "folio_attachment",
        sourceEntityId: att.id,
        title: `Folio allegato — ${att.fileName}`,
        text: [`Allegato folio: ${att.fileName}`, text].join("\n\n"),
        metadata: { folioId: att.folioId, mimeType: att.mimeType },
      });
    } catch {
      // skip binary attachments
    }
  }

  return docs;
}

export function moduleLabel(module: KnowledgeModule | string): string {
  const labels: Record<string, string> = {
    menu: "Menu",
    recipes: "Ricette",
    food_cost: "Food Cost",
    drink_cost: "Drink Cost",
    staff_cost: "Staff Cost",
    haccp: "HACCP",
    sop: "SOP",
    reception: "Reception",
    housekeeping: "Housekeeping",
    hotel: "Hotel",
    faq: "FAQ",
    software_manual: "Manuale software",
    contracts: "Contratti",
    regulations: "Regolamenti",
    guest_folio: "Guest Folio",
    guest_register: "Registro Alloggiati",
    operational_notes: "Note operative",
    general: "Generale",
    platform_manual: "Manuale piattaforma",
  };
  return labels[module] ?? module;
}
