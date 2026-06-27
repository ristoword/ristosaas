import type { UserRole } from "@/lib/auth/types";

export const MODULE_IDS = [
  "sala",
  "cassa",
  "kitchen",
  "pizzeria",
  "bar",
  "inventory",
  "foodcost",
  "cantina",
  "crm",
  "haccp",
  "hotel",
  "reception",
  "housekeeping",
  "prenotazioni",
  "room-service",
  "catering",
  "staff",
  "turni",
  "dashboard",
  "owner",
  "supervisor",
  "super-admin",
  "hardware",
  "qr",
  "licenses",
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export type ModuleSnapshotOptions = {
  tenantId: string;
  userId?: string;
  periodDays?: number;
};

export type ModuleDefinition = {
  id: ModuleId;
  roles: readonly UserRole[];
  focus: string;
  buildSnapshot: (options: ModuleSnapshotOptions) => Promise<unknown>;
};

export type ModuleAiResponse = {
  module: ModuleId;
  generatedAt: string;
  snapshot: unknown;
  insights: string | null;
  source: "rules" | "rules+ai";
};

export type ModuleAiRequest = {
  enrich?: boolean;
  stream?: boolean;
  locale?: string;
  periodDays?: number;
};
