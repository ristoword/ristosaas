import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

export type PreconfiguredAgent = {
  slug: string;
  name: string;
  module: string;
  description: string;
  systemPrompt: string;
};

export const PRECONFIGURED_AGENTS: PreconfiguredAgent[] = [
  { slug: "reception-ai", name: "Reception AI", module: "reception", description: "Front office, check-in/out, info ospiti.", systemPrompt: "Sei Reception AI di RistoSimply. Assistenza front office hotel e ristorante." },
  { slug: "concierge-ai", name: "Concierge AI", module: "hotel", description: "Concierge digitale per ospiti.", systemPrompt: "Sei Concierge AI. Suggerisci esperienze, trasporti e servizi locali." },
  { slug: "guest-folio-ai", name: "Guest Folio AI", module: "hotel", description: "Gestione conto ospite e addebiti.", systemPrompt: "Sei Guest Folio AI. Supporta conto ospite, addebiti e chiusure." },
  { slug: "booking-ai", name: "Booking AI", module: "prenotazioni", description: "Prenotazioni tavoli e camere.", systemPrompt: "Sei Booking AI. Gestisci prenotazioni, disponibilità e conferme." },
  { slug: "housekeeping-ai", name: "Housekeeping AI", module: "housekeeping", description: "Pulizie camere e turni.", systemPrompt: "Sei Housekeeping AI. Coordina pulizie, stati camera e priorità." },
  { slug: "revenue-ai", name: "Revenue AI", module: "dashboard", description: "Revenue management e pricing.", systemPrompt: "Sei Revenue AI. Analizza occupazione, ADR e strategie tariffarie." },
  { slug: "crm-ai", name: "CRM AI", module: "crm", description: "Relazioni clienti e fidelizzazione.", systemPrompt: "Sei CRM AI. Profila clienti, segmenta e suggerisci azioni CRM." },
  { slug: "kitchen-ai", name: "Kitchen AI", module: "kitchen", description: "Cucina, pass e produzione.", systemPrompt: "Sei Kitchen AI. Supporta pass, tempi e organizzazione cucina." },
  { slug: "food-cost-ai", name: "Food Cost AI", module: "foodcost", description: "Food cost e margini piatti.", systemPrompt: "Sei Food Cost AI. Analizza costi ingredienti e margini menu." },
  { slug: "drink-cost-ai", name: "Drink Cost AI", module: "cantina", description: "Costi beverage e carta vini.", systemPrompt: "Sei Drink Cost AI. Ottimizza costi drink e abbinamenti." },
  { slug: "inventory-ai", name: "Inventory AI", module: "magazzino", description: "Magazzino e scorte.", systemPrompt: "Sei Inventory AI. Monitora scorte, rotazioni e riordini." },
  { slug: "staff-cost-ai", name: "Staff Cost AI", module: "staff", description: "Costo del personale e produttività.", systemPrompt: "Sei Staff Cost AI. Analizza costi staff e produttività reparto." },
  { slug: "purchasing-ai", name: "Purchasing AI", module: "magazzino", description: "Acquisti e fornitori.", systemPrompt: "Sei Purchasing AI. Ottimizza ordini fornitore e negoziazione." },
  { slug: "maintenance-ai", name: "Maintenance AI", module: "general", description: "Manutenzione impianti e asset.", systemPrompt: "Sei Maintenance AI. Gestisci ticket manutenzione e priorità." },
  { slug: "marketing-ai", name: "Marketing AI", module: "crm", description: "Campagne e promozioni.", systemPrompt: "Sei Marketing AI. Proponi campagne, offerte e contenuti." },
  { slug: "accounting-ai", name: "Accounting AI", module: "dashboard", description: "Contabilità e report finanziari.", systemPrompt: "Sei Accounting AI. Supporta report, margini e quadrature." },
  { slug: "haccp-ai", name: "HACCP AI", module: "haccp", description: "Sicurezza alimentare e compliance.", systemPrompt: "Sei HACCP AI. Verifica procedure HACCP, temperature e non conformità." },
];

export async function ensureDefaultAgentsForTenant(tenantId: string): Promise<number> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return 0;

  let created = 0;
  for (const preset of PRECONFIGURED_AGENTS) {
    const exists = await prisma.aiAgent.findUnique({
      where: { tenantId_slug: { tenantId, slug: preset.slug } },
    });
    if (exists) continue;
    try {
      await prisma.aiAgent.create({
        data: {
          id: randomUUID(),
          tenantId,
          slug: preset.slug,
          name: preset.name,
          module: preset.module,
          description: preset.description,
          systemPrompt: preset.systemPrompt,
          prompt: preset.description,
        },
      });
      created++;
    } catch {
      /* race or constraint — skip */
    }
  }
  return created;
}

export async function seedAllTenantsAgents(): Promise<{ tenants: number; created: number }> {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  let created = 0;
  for (const t of tenants) {
    created += await ensureDefaultAgentsForTenant(t.id);
  }
  return { tenants: tenants.length, created };
}
