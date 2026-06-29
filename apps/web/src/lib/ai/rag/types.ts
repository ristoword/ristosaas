/** Enterprise RAG — shared types and constants. */

export const KNOWLEDGE_SOURCE = "knowledge" as const;
export const MANUAL_SOURCE = "manual" as const;

export type KnowledgeModule =
  | "menu"
  | "recipes"
  | "food_cost"
  | "drink_cost"
  | "staff_cost"
  | "haccp"
  | "sop"
  | "reception"
  | "housekeeping"
  | "hotel"
  | "faq"
  | "software_manual"
  | "contracts"
  | "regulations"
  | "guest_folio"
  | "guest_register"
  | "operational_notes"
  | "general"
  | "platform_manual";

export type KnowledgeChunkInput = {
  chunkIndex: number;
  text: string;
  sectionId: string;
  metadata?: Record<string, unknown>;
};

export type KnowledgeSearchFilters = {
  tenantId?: string | null;
  modules?: string[];
  categories?: string[];
  language?: string;
  documentIds?: string[];
  includePlatformManual?: boolean;
};

export type KnowledgeSearchHit = {
  chunkKey: string;
  sectionId: string;
  content: string;
  score: number;
  tenantId: string | null;
  documentId: string | null;
  module: string | null;
  category: string | null;
  language: string | null;
  documentTitle?: string | null;
  metadata?: Record<string, unknown>;
};

export type IndexingProgressEvent = {
  type: "progress" | "done" | "error";
  jobId: string;
  progressPct: number;
  chunksDone: number;
  chunksTotal: number;
  message?: string;
};

export type EntitySyncDescriptor = {
  module: KnowledgeModule;
  category: string;
  sourceEntity: string;
  title: string;
  text: string;
  sourceEntityId: string;
  language?: string;
  metadata?: Record<string, unknown>;
};
