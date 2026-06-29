import type { KnowledgeModule } from "@/lib/ai/rag/types";

/** Map orchestrator / AI agent module IDs to knowledge base modules for filtered RAG. */
export function moduleToKnowledgeModules(moduleId: string): KnowledgeModule[] {
  const map: Record<string, KnowledgeModule[]> = {
    sala: ["menu", "recipes", "sop", "faq", "software_manual"],
    kitchen: ["menu", "recipes", "food_cost", "haccp", "sop"],
    foodcost: ["food_cost", "recipes", "menu"],
    food_cost: ["food_cost", "recipes", "menu"],
    inventory: ["menu", "recipes", "haccp", "operational_notes"],
    magazzino: ["menu", "recipes", "haccp", "operational_notes"],
    cantina: ["drink_cost", "menu", "recipes"],
    bar: ["drink_cost", "menu", "recipes"],
    pizzeria: ["menu", "recipes", "food_cost"],
    crm: ["faq", "contracts", "general"],
    hotel: ["hotel", "reception", "housekeeping", "guest_folio", "guest_register"],
    reception: ["reception", "hotel", "guest_folio", "guest_register", "faq"],
    housekeeping: ["housekeeping", "hotel", "sop"],
    prenotazioni: ["faq", "menu", "hotel", "reception"],
    catering: ["menu", "recipes", "contracts"],
    dashboard: ["general", "software_manual", "faq"],
    supervisor: ["food_cost", "staff_cost", "haccp", "operational_notes", "general"],
    staff: ["staff_cost", "sop", "operational_notes"],
    turni: ["staff_cost", "sop"],
    haccp: ["haccp", "sop", "regulations"],
    hardware: ["software_manual", "sop"],
    cassa: ["menu", "software_manual", "faq"],
    folio: ["guest_folio", "hotel", "reception"],
    partner: ["contracts", "faq", "software_manual"],
    dealer: ["contracts", "faq"],
    marketing: ["faq", "menu", "general"],
    revenue: ["food_cost", "drink_cost", "staff_cost", "menu"],
  };
  return map[moduleId] ?? ["general", "faq", "software_manual"];
}

export const AGENT_MODULE_LABELS: Record<string, string> = {
  reception: "AI Reception",
  hotel: "AI Concierge",
  prenotazioni: "AI Booking",
  folio: "AI Guest Folio",
  housekeeping: "AI Housekeeping",
  foodcost: "AI Food Cost",
  food_cost: "AI Food Cost",
  cantina: "AI Drink Cost",
  bar: "AI Drink Cost",
  staff: "AI Staff Cost",
  turni: "AI Staff Cost",
  magazzino: "AI Magazzino",
  inventory: "AI Magazzino",
  sala: "AI Sala",
  kitchen: "AI Cucina",
  pizzeria: "AI KDS",
  dashboard: "AI Revenue",
  crm: "AI Marketing",
  partner: "AI Partner",
  supervisor: "AI Super Admin",
};
