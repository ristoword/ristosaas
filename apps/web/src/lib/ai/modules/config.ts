import type { UserRole } from "@/lib/auth/types";
import { moduleSnapshots } from "@/lib/ai/modules/snapshots";
import type { ModuleDefinition, ModuleId } from "@/lib/ai/modules/types";
import { ORCHESTRATOR_STREAM_CONTEXT, resolveModuleId } from "@/lib/ai/module-ids";

export { MODULE_ALIASES } from "@/lib/ai/module-ids";

const R = {
  sala: ["sala", "cassa", "supervisor", "owner", "super_admin"] as const,
  cassa: ["cassa", "supervisor", "owner", "super_admin"] as const,
  kitchen: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] as const,
  pizzeria: ["pizzeria", "supervisor", "owner", "super_admin"] as const,
  bar: ["bar", "supervisor", "owner", "super_admin"] as const,
  inventory: ["magazzino", "cucina", "supervisor", "owner", "super_admin"] as const,
  foodcost: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] as const,
  cantina: ["owner", "supervisor", "sala", "bar", "super_admin"] as const,
  crm: ["reception", "hotel_manager", "sala", "cassa", "supervisor", "owner", "super_admin"] as const,
  haccp: ["cucina", "magazzino", "supervisor", "owner", "super_admin"] as const,
  hotel: ["hotel_manager", "reception", "housekeeping", "supervisor", "owner", "super_admin"] as const,
  reception: ["reception", "hotel_manager", "supervisor", "owner", "super_admin"] as const,
  housekeeping: ["housekeeping", "hotel_manager", "reception", "supervisor", "owner", "super_admin"] as const,
  prenotazioni: ["sala", "cassa", "reception", "supervisor", "owner", "super_admin"] as const,
  roomService: ["staff", "reception", "housekeeping", "hotel_manager", "supervisor", "owner", "super_admin"] as const,
  catering: ["sala", "supervisor", "owner", "super_admin"] as const,
  staff: ["staff", "supervisor", "owner", "super_admin"] as const,
  turni: ["staff", "supervisor", "owner", "super_admin"] as const,
  dashboard: ["sala", "cucina", "bar", "pizzeria", "cassa", "magazzino", "staff", "supervisor", "owner", "super_admin", "hotel_manager", "reception", "housekeeping"] as const,
  owner: ["owner", "super_admin"] as const,
  supervisor: ["supervisor", "owner", "super_admin"] as const,
  superAdmin: ["super_admin"] as const,
  hardware: ["owner", "super_admin"] as const,
  qr: ["sala", "cassa", "reception", "supervisor", "owner", "super_admin"] as const,
  licenses: ["owner", "super_admin"] as const,
} satisfies Record<string, readonly UserRole[]>;

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  sala: {
    id: "sala",
    roles: R.sala,
    focus: "gestione sala, tavoli, comande attive e prenotazioni del giorno",
    buildSnapshot: moduleSnapshots.sala,
  },
  cassa: {
    id: "cassa",
    roles: R.cassa,
    focus: "chiusure conto, incassi, mix pagamenti e trend giornalieri",
    buildSnapshot: moduleSnapshots.cassa,
  },
  kitchen: {
    id: "kitchen",
    roles: R.kitchen,
    focus: "cucina, comande, ricette, scorte, food cost e menu operativo",
    buildSnapshot: moduleSnapshots.kitchen,
  },
  pizzeria: {
    id: "pizzeria",
    roles: R.pizzeria,
    focus: "comande pizzeria, tempi di servizio e produttività forno",
    buildSnapshot: moduleSnapshots.pizzeria,
  },
  bar: {
    id: "bar",
    roles: R.bar,
    focus: "comande bar, drink, scorte beverage e incasso area bar",
    buildSnapshot: moduleSnapshots.bar,
  },
  inventory: {
    id: "inventory",
    roles: R.inventory,
    focus: "magazzino, scorte, lotti, riordini e movimenti",
    buildSnapshot: moduleSnapshots.inventory,
  },
  foodcost: {
    id: "foodcost",
    roles: R.foodcost,
    focus: "food cost, margini piatti, pricing dinamico e piatti da rivedere",
    buildSnapshot: moduleSnapshots.foodcost,
  },
  cantina: {
    id: "cantina",
    roles: R.cantina,
    focus: "cantina vini, giacenze, annate, abbinamenti e margini bottiglia",
    buildSnapshot: moduleSnapshots.cantina,
  },
  crm: {
    id: "crm",
    roles: R.crm,
    focus: "clienti, VIP, allergeni, preferenze e fidelizzazione",
    buildSnapshot: moduleSnapshots.crm,
  },
  haccp: {
    id: "haccp",
    roles: R.haccp,
    focus: "registro HACCP, non conformità, controlli temperatura e azioni correttive",
    buildSnapshot: moduleSnapshots.haccp,
  },
  hotel: {
    id: "hotel",
    roles: R.hotel,
    focus: "occupazione camere, arrivi, partenze e prenotazioni attive",
    buildSnapshot: moduleSnapshots.hotel,
  },
  reception: {
    id: "reception",
    roles: R.reception,
    focus: "front desk, check-in, folio aperti e soggiorni in corso",
    buildSnapshot: moduleSnapshots.reception,
  },
  housekeeping: {
    id: "housekeeping",
    roles: R.housekeeping,
    focus: "pulizie camere, task pendenti e assegnazioni",
    buildSnapshot: moduleSnapshots.housekeeping,
  },
  prenotazioni: {
    id: "prenotazioni",
    roles: R.prenotazioni,
    focus: "prenotazioni ristorante, coperti e disponibilità tavoli",
    buildSnapshot: moduleSnapshots.prenotazioni,
  },
  "room-service": {
    id: "room-service",
    roles: R.roomService,
    focus: "ordini room service, consegne camere e addebiti folio",
    buildSnapshot: moduleSnapshots["room-service"],
  },
  catering: {
    id: "catering",
    roles: R.catering,
    focus: "eventi catering, preventivi e pianificazione menu",
    buildSnapshot: moduleSnapshots.catering,
  },
  staff: {
    id: "staff",
    roles: R.staff,
    focus: "personale, turni timbrati, premi e performance",
    buildSnapshot: moduleSnapshots.staff,
  },
  turni: {
    id: "turni",
    roles: R.turni,
    focus: "pianificazione turni, copertura reparti e assenze",
    buildSnapshot: moduleSnapshots.turni,
  },
  dashboard: {
    id: "dashboard",
    roles: R.dashboard,
    focus: "panoramica operativa del giorno e KPI principali",
    buildSnapshot: moduleSnapshots.dashboard,
  },
  owner: {
    id: "owner",
    roles: R.owner,
    focus: "vista owner su incassi, costi, licenza e salute del business",
    buildSnapshot: moduleSnapshots.owner,
  },
  supervisor: {
    id: "supervisor",
    roles: R.supervisor,
    focus: "supervisione multi-reparto, margini, storni e alert operativi",
    buildSnapshot: moduleSnapshots.supervisor,
  },
  "super-admin": {
    id: "super-admin",
    roles: R.superAdmin,
    focus: "amministrazione tenant, utenti attivi e sessioni",
    buildSnapshot: moduleSnapshots["super-admin"],
  },
  hardware: {
    id: "hardware",
    roles: R.hardware,
    focus: "dispositivi hardware, stampanti, KDS e routing stampe",
    buildSnapshot: moduleSnapshots.hardware,
  },
  qr: {
    id: "qr",
    roles: R.qr,
    focus: "menu QR tavoli e camere, copertura digitale",
    buildSnapshot: moduleSnapshots.qr,
  },
  licenses: {
    id: "licenses",
    roles: R.licenses,
    focus: "licenza SaaS, posti, scadenza e abbonamento billing",
    buildSnapshot: moduleSnapshots.licenses,
  },
};

/** Maps module id to stream-status context key. */
export const MODULE_STATUS_KEYS: Partial<Record<ModuleId, string>> = {
  ...ORCHESTRATOR_STREAM_CONTEXT,
  crm: "customers",
  "room-service": "hotel",
  cassa: "cassa",
  dashboard: "briefing",
  owner: "supervisor",
};

export function normalizeModuleId(raw: string): ModuleId | null {
  return resolveModuleId(raw);
}

export function getModuleDefinition(moduleId: ModuleId): ModuleDefinition {
  return MODULE_REGISTRY[moduleId];
}
