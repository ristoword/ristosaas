import type { FolioChargeSource } from "@prisma/client";
import type { PostFolioChargeInput } from "@/lib/hotel/folio-service";

export type RevenueSection =
  | "CAMERA"
  | "RISTORANTE"
  | "BAR"
  | "ROOM_SERVICE"
  | "SPA"
  | "MINIBAR"
  | "LAVANDERIA"
  | "PARCHEGGIO"
  | "TELEFONO"
  | "CATERING"
  | "EVENTI"
  | "EXTRA";

const SECTION_CONFIG: Record<
  RevenueSection,
  { source: FolioChargeSource; department: string; vatPct: number }
> = {
  CAMERA: { source: "hotel", department: "Front Office", vatPct: 10 },
  RISTORANTE: { source: "restaurant", department: "Ristorante", vatPct: 10 },
  BAR: { source: "restaurant", department: "Bar", vatPct: 10 },
  ROOM_SERVICE: { source: "room_service", department: "Room Service", vatPct: 10 },
  SPA: { source: "manual", department: "SPA", vatPct: 10 },
  MINIBAR: { source: "manual", department: "Minibar", vatPct: 10 },
  LAVANDERIA: { source: "manual", department: "Lavanderia", vatPct: 10 },
  PARCHEGGIO: { source: "manual", department: "Parcheggio", vatPct: 10 },
  TELEFONO: { source: "manual", department: "Telefono", vatPct: 10 },
  CATERING: { source: "manual", department: "Catering", vatPct: 10 },
  EVENTI: { source: "manual", department: "Eventi", vatPct: 10 },
  EXTRA: { source: "manual", department: "Extra", vatPct: 10 },
};

export function buildRevenueChargeInput(
  base: Omit<PostFolioChargeInput, "source" | "section"> & {
    section: RevenueSection;
    source?: FolioChargeSource;
  },
): PostFolioChargeInput {
  const cfg = SECTION_CONFIG[base.section];
  return {
    ...base,
    source: base.source ?? cfg.source,
    department: base.department ?? cfg.department,
    section: base.section,
    vatPct: base.vatPct ?? cfg.vatPct,
  };
}

export function listRevenueSections() {
  return Object.entries(SECTION_CONFIG).map(([section, cfg]) => ({
    section: section as RevenueSection,
    ...cfg,
  }));
}
