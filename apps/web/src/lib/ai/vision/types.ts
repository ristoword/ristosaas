/** Tipi di analisi Vision AI supportati. */
export const VISION_TASK_TYPES = [
  "invoice",
  "ddt",
  "supplier_price_list",
  "product_recognition",
  "label_recognition",
  "paper_menu",
  "plating_verification",
  "haccp_photo",
] as const;

export type VisionTaskType = (typeof VISION_TASK_TYPES)[number];

export type VisionIntegrationModule = "inventory" | "foodcost" | "cantina" | "hotel" | "crm";

export type VisionLineItem = {
  description: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  sku: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
};

export type VisionDocumentHeader = {
  supplierName: string | null;
  documentNumber: string | null;
  documentDate: string | null;
  totalAmount: number | null;
  currency: string | null;
  taxAmount: number | null;
  notes: string | null;
};

export type VisionProductInfo = {
  name: string | null;
  brand: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  barcode: string | null;
  allergens: string[];
  ingredients: string[];
  expiryDate: string | null;
  lotNumber: string | null;
  storageInstructions: string | null;
};

export type VisionMenuItem = {
  name: string;
  category: string | null;
  price: number | null;
  currency: string | null;
  description: string | null;
  allergens: string[];
};

export type VisionPlatingAssessment = {
  dishName: string | null;
  presentationScore: number | null;
  portionConsistency: "ok" | "under" | "over" | "unknown";
  garnishPresent: boolean | null;
  cleanlinessScore: number | null;
  issues: string[];
  suggestions: string[];
};

export type VisionHaccpAssessment = {
  checkType: string | null;
  location: string | null;
  temperatureC: number | null;
  visualConformity: boolean | null;
  hygieneIssues: string[];
  correctiveActions: string[];
  riskLevel: "low" | "medium" | "high" | "unknown";
};

export type VisionRawAnalysis = {
  taskType: VisionTaskType;
  confidence: number;
  confidenceLevel: "low" | "medium" | "high";
  summary: string;
  warnings: string[];
  document?: VisionDocumentHeader & { lineItems?: VisionLineItem[] };
  products?: VisionProductInfo[];
  menuItems?: VisionMenuItem[];
  plating?: VisionPlatingAssessment;
  haccp?: VisionHaccpAssessment;
  metadata?: Record<string, unknown>;
};

export type VisionIntegrationPayload = {
  module: VisionIntegrationModule;
  action: string;
  data: Record<string, unknown>;
  priority: "low" | "medium" | "high";
};

export type VisionAnalysisResult = {
  taskType: VisionTaskType;
  generatedAt: string;
  tenantId: string;
  analysis: VisionRawAnalysis;
  integrations: VisionIntegrationPayload[];
  source: "openai_vision" | "fallback";
  valid: boolean;
  validationErrors: string[];
};

export type VisionAnalyzeRequest = {
  taskType: VisionTaskType;
  /** Base64, data URL (data:image/...;base64,...) o URL HTTPS pubblico */
  image: string;
  locale?: string;
  hints?: string;
  mimeType?: string;
};

export const TASK_INTEGRATIONS: Record<VisionTaskType, readonly VisionIntegrationModule[]> = {
  invoice: ["inventory", "foodcost"],
  ddt: ["inventory"],
  supplier_price_list: ["inventory", "foodcost"],
  product_recognition: ["inventory", "foodcost", "cantina", "hotel", "crm"],
  label_recognition: ["inventory", "foodcost", "crm"],
  paper_menu: ["foodcost"],
  plating_verification: ["foodcost"],
  haccp_photo: ["inventory"],
};

export const TASK_LABELS: Record<VisionTaskType, string> = {
  invoice: "Lettura fatture",
  ddt: "Lettura DDT",
  supplier_price_list: "Lettura listini fornitori",
  product_recognition: "Riconoscimento prodotti",
  label_recognition: "Riconoscimento etichette",
  paper_menu: "Lettura menu cartacei",
  plating_verification: "Verifica impiattamenti",
  haccp_photo: "Controllo HACCP da fotografia",
};
