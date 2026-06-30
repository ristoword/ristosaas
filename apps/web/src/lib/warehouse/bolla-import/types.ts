export type BollaImportStatus =
  | "queued"
  | "analyzing"
  | "ocr"
  | "matching"
  | "review"
  | "importing"
  | "completed"
  | "failed"
  | "undone";

export type BollaImportStep =
  | "queued"
  | "analyzing"
  | "ocr"
  | "matching"
  | "review"
  | "importing"
  | "completed"
  | "failed";

export type BollaLineMatchStatus = "matched" | "new" | "created";

export type BollaImportLineDto = {
  id: string;
  lineOrder: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  vatPct: number | null;
  discountPct: number | null;
  lineTotal: number | null;
  lotNumber: string | null;
  expiryDate: string | null;
  suggestedCategory: string;
  selectedCategory: string;
  warehouseLocation: string;
  warehouseItemId: string | null;
  warehouseItemName: string | null;
  wineCellarItemId: string | null;
  wineCellarItemName: string | null;
  matchStatus: BollaLineMatchStatus;
  selected: boolean;
  imported: boolean;
};

export type BollaImportDto = {
  id: string;
  supplierId: string | null;
  supplierName: string;
  documentNumber: string | null;
  documentDate: string | null;
  bollaNumber: string | null;
  invoiceNumber: string | null;
  vatAmount: number | null;
  totalAmount: number | null;
  status: BollaImportStatus;
  currentStep: string;
  progressPct: number;
  errorMessage: string | null;
  documentMime: string | null;
  documentFileName: string | null;
  ocrConfidence: number | null;
  lineCount: number;
  matchedCount: number;
  newCount: number;
  durationMs: number | null;
  createdByName: string | null;
  createdAt: string;
  importedAt: string | null;
  lines: BollaImportLineDto[];
};

export type BollaDashboardDto = {
  recentImports: Array<{
    id: string;
    supplierName: string;
    status: BollaImportStatus;
    lineCount: number;
    matchedCount: number;
    newCount: number;
    createdAt: string;
    durationMs: number | null;
  }>;
  stats: {
    totalImports: number;
    itemsRecognized: number;
    itemsNew: number;
    ocrErrors: number;
    avgDurationMs: number | null;
  };
};

export type ConfirmBollaLineInput = {
  id: string;
  selected: boolean;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number | null;
  vatPct?: number | null;
  selectedCategory?: string;
  warehouseLocation?: string;
  warehouseItemId?: string | null;
  createProduct?: boolean;
};
