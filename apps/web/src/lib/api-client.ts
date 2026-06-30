/**
 * Thin API client — wraps fetch with JSON handling.
 * All frontend contexts call this instead of managing state locally.
 */

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit, canRetry = true): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (res.status === 401 && canRetry && path !== "/auth/login" && path !== "/auth/refresh" && path !== "/auth/logout") {
    const refreshed = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (refreshed.ok) {
      return request<T>(path, init, false);
    }
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

function get<T>(path: string) {
  return request<T>(path);
}
function post<T>(path: string, body: unknown) {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}
function put<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}
function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}
function del<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

async function fetchBlob(path: string): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.blob();
}

type AuthUser = {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
  mustChangePassword?: boolean;
  isLocked?: boolean;
};
export type AdminUser = AuthUser & {
  failedLoginAttempts?: number;
  lockedUntil?: number | null;
  partnerCode?: string | null;
};
export type AdminTenant = {
  id: string;
  name: string;
  plan: string;
  users: number;
  created: string;
  status: "active" | "blocked";
};
export type AdminPlatformConfig = {
  maintenanceMode: boolean;
  updatedAt: string;
};

export type AiConfigCenterPayload = import("@/lib/ai/config-center/service").AiConfigCenterPayload;
export type AiEnterpriseControlPayload = import("@/lib/ai/control-center/types").AiEnterpriseControlPayload;
export type AdminSystemSnapshot = {
  appVersion: string;
  processUptimeSec: number;
  dbOk: boolean;
  serverTime: string;
};
export type AdminTenantOnboardingResult = {
  tenant: { id: string; name: string; slug: string; plan: string };
  license: { id: string; key: string; status: string; plan: string; seats: number; usedSeats: number; expiresAt: string };
  adminUser: { id: string; username: string; email: string; role: string; mustChangePassword: boolean };
  bootstrap?: {
    restaurantRooms: number;
    restaurantTables: number;
    hotelRooms: number;
    hotelRatePlans: number;
    seedDefaults?: {
      hotelRoomsAdded: number;
      tablesAdded: number;
      recipesAdded: number;
      menuItemsAdded: number;
      dailyDishesAdded: number;
    };
  };
};
export type AdminTenantBootstrapResult = {
  tenant: { id: string; name: string; slug: string; plan: string };
  created: {
    ratePlans: number;
    rooms: number;
    restaurantRooms: number;
    restaurantTables: number;
    warehouseItems: number;
    recipes: number;
    menuItems: number;
    dailyDishes: number;
    staffMembers: number;
    customers: number;
    reports: number;
  };
  seedDefaults?: {
    hotelRoomsAdded: number;
    tablesAdded: number;
    recipesAdded: number;
    menuItemsAdded: number;
    dailyDishesAdded: number;
  } | null;
};
export type AdminLicense = {
  id: string;
  tenantId: string;
  tenantName: string;
  key: string;
  status: "trial" | "active" | "expired" | "suspended";
  plan: string;
  billingCycle: string;
  seats: number;
  usedSeats: number;
  activatedAt: string;
  expiresAt: string;
};
export type AdminEmailConfig = {
  id: string;
  tenantId: string;
  tenantName: string;
  host: string;
  port: number;
  username: string;
  fromAddress: string;
  secure: boolean;
  lastTestStatus: string | null;
  lastTestedAt: string | null;
};

/* ─── Kitchen / Recipes ──────────────────────────── */

export const kitchenApi = {
  listRecipes: () => get<Recipe[]>("/kitchen/recipes"),
  getRecipe: (id: string) => get<{ recipe: Recipe; foodCost: FoodCostResult }>(`/kitchen/recipes/${id}`),
  createRecipe: (data: Omit<Recipe, "id" | "createdAt">) => post<{ recipe: Recipe; foodCost: FoodCostResult }>("/kitchen/recipes", data),
  updateRecipe: (id: string, data: Partial<Recipe>) => put<{ recipe: Recipe; foodCost: FoodCostResult }>(`/kitchen/recipes/${id}`, data),
  deleteRecipe: (id: string) => del<{ deleted: boolean }>(`/kitchen/recipes/${id}`),
  getFoodCost: (recipeId: string) => get<FoodCostResult>(`/kitchen/food-cost/${recipeId}`),
  pricingInsights: (days = 14) =>
    get<{ generatedAt: string; periodDays: number; foodCost: KitchenOperationalSnapshot["foodCost"]; dynamicPricing: KitchenOperationalSnapshot["dynamicPricing"] }>(
      `/kitchen/pricing?days=${days}`,
    ),
  generateMenu: (days = 14) =>
    get<{ generatedAt: string; periodDays: number; menuGenerator: KitchenOperationalSnapshot["menuGenerator"]; hotelBridge: KitchenOperationalSnapshot["hotelBridge"] }>(
      `/kitchen/menu-generator?days=${days}`,
    ),
};

/* ─── Menu ───────────────────────────────────────── */

export const menuApi = {
  listItems: () => get<MenuItem[]>("/menu/items"),
  getItem: (id: string) => get<MenuItem>(`/menu/items/${id}`),
  createItem: (data: Omit<MenuItem, "id"> & { fromRecipeId?: string }) => post<MenuItem>("/menu/items", data),
  updateItem: (id: string, data: Partial<MenuItem>) => put<MenuItem>(`/menu/items/${id}`, data),
  deleteItem: (id: string) => del<{ deleted: boolean }>(`/menu/items/${id}`),

  listDaily: () => get<DailyDish[]>("/menu/daily"),
  getDaily: (id: string) => get<DailyDish>(`/menu/daily/${id}`),
  createDaily: (data: Omit<DailyDish, "id"> & { fromRecipeId?: string }) => post<DailyDish>("/menu/daily", data),
  updateDaily: (id: string, data: Partial<DailyDish>) => put<DailyDish>(`/menu/daily/${id}`, data),
  deleteDaily: (id: string) => del<{ deleted: boolean }>(`/menu/daily/${id}`),
};

/* ─── Orders ─────────────────────────────────────── */

export const ordersApi = {
  list: (params?: { status?: string; area?: string; table?: string; active?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.area) qs.set("area", params.area);
    if (params?.table) qs.set("table", params.table);
    if (params?.active) qs.set("active", "true");
    const q = qs.toString();
    return get<Order[]>(`/orders${q ? `?${q}` : ""}`);
  },
  get: (id: string) => get<Order>(`/orders/${id}`),
  create: (
    data: Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status" | "onlinePaymentStatus" | "stripeCheckoutSessionId">,
  ) => post<Order>("/orders", data),
  update: (id: string, data: Partial<Order>) => put<Order>(`/orders/${id}`, data),
  appendItems: (id: string, items: OrderItem[], notes?: string) =>
    post<Order>(`/orders/${id}/append`, { items, notes }),
  delete: (id: string) => del<{ deleted: boolean }>(`/orders/${id}`),
  patchStatus: (id: string, status: string, course?: number) =>
    patch<{ order: Order; discharge: unknown }>(`/orders/${id}/status`, { status, ...(course != null ? { course } : {}) }),
  marcia: (id: string, course: number) => post<Order>(`/orders/${id}/marcia`, { course }),
};

/* ─── Tables / Rooms ─────────────────────────────── */

export const tablesApi = {
  list: (roomId?: string) => get<SalaTable[]>(roomId ? `/tables?roomId=${roomId}` : "/tables"),
  get: (id: string) => get<SalaTable>(`/tables/${id}`),
  create: (data: Omit<SalaTable, "id">) => post<SalaTable>("/tables", data),
  update: (id: string, data: Partial<SalaTable>) => put<SalaTable>(`/tables/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/tables/${id}`),
  patchStatus: (id: string, stato: string) => patch<SalaTable>(`/tables/${id}/status`, { stato }),
};

export const roomsApi = {
  list: () => get<Room[]>("/rooms"),
  ensureDefault: () => post<Room>("/rooms/ensure-default", {}),
};

/* ─── Warehouse ──────────────────────────────────── */

export const warehouseApi = {
  list: () => get<{ items: StockItem[]; lowStock: StockItem[]; alerts: WarehouseAlert[]; totalValue: number }>("/warehouse/stock"),
  create: (data: Omit<StockItem, "id">) => post<StockItem>("/warehouse/stock", data),
  update: (id: string, data: Partial<StockItem>) => put<StockItem>(`/warehouse/stock/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/warehouse/stock/${id}`),
  load: (productId: string, qty: number, reason?: string) => post<{ item: StockItem }>("/warehouse/load", { productId, qty, reason }),
  discharge: (productName: string, qty: number, reason: string) => post<{ item: StockItem }>("/warehouse/discharge", { productName, qty, reason }),
  movements: () => get<StockMovement[]>("/warehouse/movements"),
  createMovement: (data: {
    warehouseItemId: string;
    type: "carico" | "scarico" | "trasferimento" | "rettifica";
    qty: number;
    reason: string;
    fromLocation?: string;
    toLocation?: string;
    note?: string;
    newQty?: number;
  }) => post<StockMovement | { item: StockItem; movement: StockMovement }>("/warehouse/movements", data),
  patchMovement: (id: string, data: { reason?: string; note?: string }) =>
    patch<StockMovement>(`/warehouse/movements/${id}`, data),
  reorder: (days = 14) =>
    get<{
      generatedAt: string;
      periodDays: number;
      reorder: KitchenOperationalSnapshot["reorder"];
      warehouse: KitchenOperationalSnapshot["warehouse"];
    }>(`/warehouse/reorder?days=${days}`),
  listEquipment: () => get<WarehouseEquipment[]>("/warehouse/equipment"),
  createEquipment: (data: Omit<WarehouseEquipment, "id">) => post<WarehouseEquipment>("/warehouse/equipment", data),
  updateEquipment: (id: string, data: Partial<WarehouseEquipment>) =>
    put<WarehouseEquipment>(`/warehouse/equipment/${id}`, data),
  deleteEquipment: (id: string) => del<{ deleted: boolean }>(`/warehouse/equipment/${id}`),
};

export type BollaImportLine = {
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
  matchStatus: "matched" | "new" | "created";
  selected: boolean;
  imported: boolean;
};

export type BollaImportRecord = {
  id: string;
  supplierId: string | null;
  supplierName: string;
  documentNumber: string | null;
  documentDate: string | null;
  bollaNumber: string | null;
  invoiceNumber: string | null;
  vatAmount: number | null;
  totalAmount: number | null;
  status: string;
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
  lines: BollaImportLine[];
};

export const bollaImportApi = {
  dashboard: () =>
    get<{
      recentImports: Array<{
        id: string;
        supplierName: string;
        status: string;
        lineCount: number;
        matchedCount: number;
        newCount: number;
        createdAt: string;
        durationMs: number | null;
        documentFileName: string | null;
        documentMime: string | null;
        bollaNumber: string | null;
        defaultWarehouseLocation: string;
        hasDocument: boolean;
      }>;
      stats: {
        totalImports: number;
        itemsRecognized: number;
        itemsNew: number;
        ocrErrors: number;
        avgDurationMs: number | null;
      };
    }>("/warehouse/bolla-import"),
  start: (payload: {
    supplierId: string;
    fileName: string;
    mimeType: string;
    contentBase64: string;
    defaultWarehouseLocation?: string;
  }) => post<{ importId: string; import: BollaImportRecord | null }>("/warehouse/bolla-import", payload),
  process: (id: string) =>
    post<{ import: BollaImportRecord | null }>(`/warehouse/bolla-import/${id}/process`, {}),
  get: (id: string) =>
    get<{ import: BollaImportRecord; audit: Array<{ id: string; action: string; createdAt: string; userName: string | null }> }>(
      `/warehouse/bolla-import/${id}`,
    ),
  confirm: (id: string, lines: Array<Partial<BollaImportLine> & { id: string; selected: boolean; createProduct?: boolean }>) =>
    post<{ import: BollaImportRecord }>(`/warehouse/bolla-import/${id}/confirm`, { lines }),
  undo: (id: string) => post<{ import: BollaImportRecord }>(`/warehouse/bolla-import/${id}/undo`, {}),
  documentUrl: (id: string, mode: "inline" | "download" = "inline") =>
    `/api/warehouse/bolla-import/${id}/document?mode=${mode}`,
};

/* ─── Staff ──────────────────────────────────────── */

export const staffApi = {
  list: () => get<StaffMember[]>("/staff"),
  get: (id: string) => get<StaffMember>(`/staff/${id}`),
  create: (data: Omit<StaffMember, "id">) => post<StaffMember>("/staff", data),
  update: (id: string, data: Partial<StaffMember>) => put<StaffMember>(`/staff/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/staff/${id}`),
  listShifts: (params?: { staffId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.staffId) qs.set("staffId", params.staffId);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    return get<StaffShift[]>(`/staff/shifts${qs.toString() ? `?${qs.toString()}` : ""}`);
  },
  clock: (staffId: string, action: "clock_in" | "clock_out", notes?: string) =>
    post<StaffShift>("/staff/shifts/clock", { staffId, action, notes }),
};

/* ─── Customers ──────────────────────────────────── */

export const customersApi = {
  list: () => get<Customer[]>("/customers"),
  get: (id: string) => get<Customer>(`/customers/${id}`),
  create: (data: Omit<Customer, "id">) => post<Customer>("/customers", data),
  update: (id: string, data: Partial<Customer>) => put<Customer>(`/customers/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/customers/${id}`),
};

/* ─── Bookings ───────────────────────────────────── */

export const bookingsApi = {
  list: () => get<Booking[]>("/bookings"),
  get: (id: string) => get<Booking>(`/bookings/${id}`),
  create: (data: Omit<Booking, "id">) => post<Booking>("/bookings", data),
  update: (id: string, data: Partial<Booking>) => put<Booking>(`/bookings/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/bookings/${id}`),
};

/* ─── Suppliers ──────────────────────────────────── */

export const suppliersApi = {
  list: () => get<Supplier[]>("/suppliers"),
  get: (id: string) => get<Supplier>(`/suppliers/${id}`),
  create: (data: Omit<Supplier, "id">) => post<Supplier>("/suppliers", data),
  update: (id: string, data: Partial<Supplier>) => put<Supplier>(`/suppliers/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/suppliers/${id}`),
  orders: (id: string) => get<PurchaseOrder[]>(`/suppliers/${id}/orders`),
  createOrder: (
    id: string,
    payload: {
      notes?: string;
      status?: "bozza" | "inviato";
      expectedAt?: string | null;
      items: Array<{
        warehouseItemId: string;
        qtyOrdered: number;
        unit: string;
        unitCost: number;
        notes?: string;
      }>;
    },
  ) => post<PurchaseOrder>(`/suppliers/${id}/orders`, payload),
};

export type PurchaseOrderStatus = "bozza" | "inviato" | "parziale" | "ricevuto" | "annullato";

export type PurchaseOrderItem = {
  id: string;
  warehouseItemId: string;
  warehouseItemName: string;
  qtyOrdered: number;
  qtyReceived: number;
  unit: string;
  unitCost: number;
  notes: string;
  lineTotal: number;
  outstandingQty: number;
};

export type PurchaseOrder = {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierName: string;
  code: string;
  status: PurchaseOrderStatus;
  notes: string;
  orderedAt: string;
  expectedAt: string | null;
  receivedAt: string | null;
  total: number;
  items: PurchaseOrderItem[];
  /** Popolato se il documento è stato archiviato (Archivio → Ordini fornitore). */
  archivedDocumentId: string | null;
};

export type PurchaseOrderReport = {
  range: { from: string | null; to: string | null };
  overall: { ordersCount: number; totalGross: number; totalReceived: number };
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    ordersCount: number;
    totalGross: number;
    totalReceived: number;
    byStatus: Partial<Record<string, number>>;
  }>;
};

export type ArchivedSupplierOrderKind = "bozza_confermata" | "ordine_confermato";

export type ArchivedSupplierOrder = {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  code: string;
  supplierId: string;
  supplierName: string;
  poStatus: PurchaseOrderStatus;
  kind: ArchivedSupplierOrderKind;
  total: number;
  orderedAt: string | null;
  notes: string;
  archivedAt: string;
};

export const purchaseOrdersApi = {
  list: (status?: PurchaseOrderStatus) =>
    get<PurchaseOrder[]>(status ? `/purchase-orders?status=${status}` : "/purchase-orders"),
  get: (id: string) => get<PurchaseOrder>(`/purchase-orders/${id}`),
  setStatus: (id: string, status: "bozza" | "inviato" | "annullato") =>
    patch<PurchaseOrder>(`/purchase-orders/${id}`, { status }),
  receive: (id: string, receipts: Array<{ itemId: string; qty: number }>) =>
    post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { receipts }),
  archive: (id: string, payload: { kind: ArchivedSupplierOrderKind }) =>
    post<{ order: PurchaseOrder }>(`/purchase-orders/${id}/archive`, payload),
  email: (id: string, payload?: { to?: string | string[]; message?: string; attachPdf?: boolean }) =>
    post<{ ok: true; messageId: string; recipients: string[] }>(
      `/purchase-orders/${id}/email`,
      payload ?? {},
    ),
  pdfUrl: (id: string) => `/api/purchase-orders/${id}/pdf`,
  report: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const q = qs.toString();
    return get<PurchaseOrderReport>(`/purchase-orders/report${q ? `?${q}` : ""}`);
  },
};

/* ─── Catering ───────────────────────────────────── */

export const cateringApi = {
  list: () => get<CateringEvent[]>("/catering"),
  get: (id: string) => get<CateringEvent>(`/catering/${id}`),
  create: (data: Omit<CateringEvent, "id">) => post<CateringEvent>("/catering", data),
  update: (id: string, data: Partial<CateringEvent>) => put<CateringEvent>(`/catering/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/catering/${id}`),
};

/* ─── Asporto ────────────────────────────────────── */

export type AsportoCloseDaySummary = {
  takeawayCount: number;
  takeawayRevenue: number;
  deliveryCount: number;
  deliveryRevenue: number;
  totalRevenue: number;
  totalOrders: number;
  cancelledCount: number;
  pendingCount: number;
  clearedCount: number;
};

export const asportoApi = {
  list: () => get<AsportoOrder[]>("/asporto"),
  get: (id: string) => get<AsportoOrder>(`/asporto/${id}`),
  create: (data: Omit<AsportoOrder, "id">) => post<AsportoOrder>("/asporto", data),
  update: (id: string, data: Partial<AsportoOrder>) => put<AsportoOrder>(`/asporto/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/asporto/${id}`),
  closeDay: () => post<AsportoCloseDaySummary>("/asporto/close-day", {}),
};

/* ─── Archivio ───────────────────────────────────── */

export const archivioApi = {
  list: () => get<ArchivedOrder[]>("/archivio"),
  get: (id: string) => get<ArchivedOrder>(`/archivio/${id}`),
  create: (data: Omit<ArchivedOrder, "id">) => post<ArchivedOrder>("/archivio", data),
  update: (id: string, data: Partial<ArchivedOrder>) => put<ArchivedOrder>(`/archivio/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/archivio/${id}`),
};

/** Documenti ordine fornitore archiviati (registro interno). */
export const archivioOrdiniFornitoreApi = {
  list: () => get<ArchivedSupplierOrder[]>("/archivio/ordini-fornitore"),
};

export type SupervisorStornoDto = {
  id: string;
  tenantId: string;
  amount: number;
  motivo: string;
  tavolo: string;
  ordineId: string;
  note: string;
  createdAt: string;
};

export const supervisorStorniApi = {
  list: () => get<SupervisorStornoDto[]>("/supervisor/storni"),
  create: (payload: { amount: number; motivo: string; tavolo?: string; ordineId?: string; note?: string }) =>
    post<SupervisorStornoDto>("/supervisor/storni", payload),
};

export type WarehouseVoiceLogDto = {
  id: string;
  tenantId: string;
  transcript: string;
  createdAt: string;
};

export const warehouseVoiceApi = {
  list: (limit?: number) =>
    get<WarehouseVoiceLogDto[]>(`/warehouse/voice-log${limit != null ? `?limit=${limit}` : ""}`),
  append: (transcript: string) => post<WarehouseVoiceLogDto>("/warehouse/voice-log", { transcript }),
};

export type OperationalNote = {
  id: string;
  area: string;
  text: string;
  createdAt: string;
};

export const operationalNotesApi = {
  list: (area: string) => get<OperationalNote[]>(`/operational-notes?area=${encodeURIComponent(area)}`),
  create: (area: string, text: string) => post<OperationalNote>("/operational-notes", { area, text }),
  delete: (id: string) => del<{ deleted: boolean }>(`/operational-notes/${id}`),
};

export type ShiftPlanType = "lavoro" | "ferie" | "malattia" | "permesso" | "riposo";

export type LeaveApproval = "approved" | "pending" | "rejected";

export type ShiftPlan = {
  id: string;
  area: string;
  day: string;
  staffName: string;
  staffId: string | null;
  startTime: string;
  endTime: string;
  hours: string;
  role: string;
  shiftType: ShiftPlanType;
  notes: string;
  assignedRooms: string[] | null;
  leaveApproval: LeaveApproval;
  createdAt: string;
  updatedAt: string;
};

export type ShiftPlanCreate = {
  area?: string;
  day: string;
  staffName: string;
  staffId?: string | null;
  startTime?: string;
  endTime?: string;
  hours?: string;
  role?: string;
  shiftType?: ShiftPlanType;
  notes?: string;
  assignedRooms?: string[] | null;
  leaveApproval?: LeaveApproval;
};

export type ShiftSyncResult = {
  updated: Array<{ staffId: string; staffName: string; newStatus: string }>;
  summary: { totalShifts: number; totalStaff: number };
};

export const shiftPlansApi = {
  list: (params?: { area?: string; from?: string; to?: string; staffId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.area) qs.set("area", params.area);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.staffId) qs.set("staffId", params.staffId);
    const q = qs.toString();
    return get<ShiftPlan[]>(`/shift-plans${q ? `?${q}` : ""}`);
  },
  create: (data: ShiftPlanCreate) => post<ShiftPlan>("/shift-plans", data),
  update: (id: string, data: Partial<ShiftPlanCreate>) => put<ShiftPlan>(`/shift-plans/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/shift-plans/${id}`),
  sync: (from: string, to: string) => post<ShiftSyncResult>("/shift-plans/sync", { from, to }),
};

export type ArchivioFiscalStub = {
  id: string;
  tenantId: string;
  kind: "entrata" | "cassa";
  reference: string;
  counterparty: string;
  issueDate: string;
  amount: number;
  vatRateNote: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const archivioFiscalStubsApi = {
  list: (kind: "entrata" | "cassa") =>
    get<ArchivioFiscalStub[]>(`/archivio/fiscal-stubs?kind=${encodeURIComponent(kind)}`),
  create: (payload: {
    kind: "entrata" | "cassa";
    reference?: string;
    counterparty?: string;
    issueDate?: string;
    amount?: number;
    vatRateNote?: string;
    notes?: string;
  }) => post<ArchivioFiscalStub>("/archivio/fiscal-stubs", payload),
};

/* ─── Room Service ───────────────────────────────── */

export type RoomServiceCategory =
  | "food" | "laundry" | "minibar" | "shoe_cleaning"
  | "linen" | "amenities" | "transport" | "other";

export type RoomServiceStatus =
  | "pending" | "in_preparation" | "out_for_delivery" | "delivered" | "cancelled";

export type RoomServiceItem = { name: string; qty: number; unitPrice: number; notes?: string };

export type RoomServiceOrder = {
  id: string;
  roomCode: string;
  guestName: string;
  category: RoomServiceCategory;
  status: RoomServiceStatus;
  items: RoomServiceItem[];
  total: number;
  notes: string;
  assignedTo: string | null;
  stayId: string | null;
  folioId: string | null;
  chargedToFolio: boolean;
  folioChargeId: string | null;
  requestedAt: string;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoomServiceCatalogItem = {
  id: string;
  name: string;
  category: RoomServiceCategory;
  unitPrice: number;
  unit: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const roomServiceApi = {
  list: (params?: { status?: RoomServiceStatus; category?: RoomServiceCategory; roomCode?: string; assignedTo?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.category) qs.set("category", params.category);
    if (params?.roomCode) qs.set("roomCode", params.roomCode);
    if (params?.assignedTo) qs.set("assignedTo", params.assignedTo);
    const q = qs.toString();
    return get<RoomServiceOrder[]>(`/hotel/room-service${q ? `?${q}` : ""}`);
  },
  create: (data: {
    roomCode: string; guestName: string; category: RoomServiceCategory;
    items: RoomServiceItem[]; notes?: string; assignedTo?: string; stayId?: string;
  }) => post<RoomServiceOrder>("/hotel/room-service", data),
  update: (id: string, data: { status?: RoomServiceStatus; assignedTo?: string | null; notes?: string }) =>
    put<RoomServiceOrder>(`/hotel/room-service/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/hotel/room-service/${id}`),
  charge: (id: string) => post<{ charge: { id: string; amount: number; description: string; postedAt: string } }>(`/hotel/room-service/${id}/charge`, {}),
  listCatalog: (params?: { category?: RoomServiceCategory; active?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.active === false) qs.set("active", "0");
    const q = qs.toString();
    return get<RoomServiceCatalogItem[]>(`/hotel/room-service/catalog${q ? `?${q}` : ""}`);
  },
  createCatalogItem: (data: { name: string; category: RoomServiceCategory; unitPrice: number; unit?: string; sortOrder?: number }) =>
    post<RoomServiceCatalogItem>("/hotel/room-service/catalog", data),
  updateCatalogItem: (id: string, data: { name?: string; unitPrice?: number; unit?: string; active?: boolean; sortOrder?: number }) =>
    put<RoomServiceCatalogItem>(`/hotel/room-service/catalog/${id}`, data),
  deleteCatalogItem: (id: string) => del<{ deleted: boolean }>(`/hotel/room-service/catalog/${id}`),
};

/* ─── Notifications ──────────────────────────────── */

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  items: AppNotification[];
  unreadCount: number;
};

export const notificationsApi = {
  list: (params?: { unread?: boolean; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.unread) qs.set("unread", "1");
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return get<NotificationsResponse>(`/notifications${q ? `?${q}` : ""}`);
  },
  create: (payload: { type?: string; title: string; message?: string; href?: string; userId?: string | null }) =>
    post<AppNotification>("/notifications", payload),
  markRead: (id: string) => patch<{ read: boolean }>(`/notifications/${id}/read`, {}),
  markAllRead: () => patch<{ marked: number }>("/notifications/read-all", {}),
};

/* ─── HACCP ───────────────────────────────────────── */

export type HaccpEntryType =
  | "temp_frigo"
  | "temp_freezer"
  | "temp_cottura"
  | "temp_abbattitore"
  | "sanificazione"
  | "ricezione_merce"
  | "pulizia_manutenzione"
  | "disinfestazione"
  | "non_conformita"
  | "formazione_personale"
  | "olio_frittura"
  | "allergeni"
  | "acqua_potabile"
  | "rifiuti"
  | "altro";

export type HaccpEntry = {
  id: string;
  tenantId: string;
  type: HaccpEntryType;
  recordedAt: string;
  location: string;
  tempC: number | null;
  thresholdMin: number | null;
  thresholdMax: number | null;
  conforme: boolean | null;
  correctiveAction: string;
  operator: string;
  notes: string;
  supplier: string;
  product: string;
  lotNumber: string;
  expiryDate: string | null;
  cleaningProduct: string;
  dilution: string;
  contactTime: string;
  createdAt: string;
  updatedAt: string;
};

export type HaccpCreatePayload = {
  type?: HaccpEntryType;
  recordedAt?: string;
  location?: string;
  tempC?: number | null;
  thresholdMin?: number | null;
  thresholdMax?: number | null;
  conforme?: boolean | null;
  correctiveAction?: string;
  operator?: string;
  notes?: string;
  supplier?: string;
  product?: string;
  lotNumber?: string;
  expiryDate?: string | null;
  cleaningProduct?: string;
  dilution?: string;
  contactTime?: string;
};

export const haccpApi = {
  list: (params?: { type?: HaccpEntryType; from?: string; to?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return get<HaccpEntry[]>(`/haccp${q ? `?${q}` : ""}`);
  },
  create: (data: HaccpCreatePayload) => post<HaccpEntry>("/haccp", data),
  update: (id: string, data: Partial<HaccpCreatePayload>) => put<HaccpEntry>(`/haccp/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/haccp/${id}`),
};

/* ─── Wine Cellar (Cantina) ─────────────────────── */

export type WineCellarItem = {
  id: string;
  tenantId: string;
  name: string;
  producer: string;
  country: string;
  region: string;
  color: string;
  body: string;
  grapeVariety: string;
  alcoholPct: number;
  vintageYear: number | null;
  bottlingYear: number | null;
  pairings: string;
  purchasePrice: number;
  sellingPrice: number;
  showPurchasePrice: boolean;
  stock: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type WineCellarCreatePayload = {
  name: string;
  producer?: string;
  country?: string;
  region?: string;
  color?: string;
  body?: string;
  grapeVariety?: string;
  alcoholPct?: number;
  vintageYear?: number | null;
  bottlingYear?: number | null;
  pairings?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  showPurchasePrice?: boolean;
  stock?: number;
  notes?: string;
};

export const cantinaApi = {
  list: (params?: { color?: string; country?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.color) qs.set("color", params.color);
    if (params?.country) qs.set("country", params.country);
    if (params?.q) qs.set("q", params.q);
    const q = qs.toString();
    return get<WineCellarItem[]>(`/cantina${q ? `?${q}` : ""}`);
  },
  create: (data: WineCellarCreatePayload) => post<WineCellarItem>("/cantina", data),
  update: (id: string, data: Partial<WineCellarCreatePayload>) => put<WineCellarItem>(`/cantina/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/cantina/${id}`),
};

/* ─── User sessions ─────────────────────────────── */

export type UserSessionRecord = {
  id: string;
  userId: string;
  tenantId: string | null;
  jti: string;
  tokenType: "access" | "refresh";
  userAgent: string | null;
  ipAddress: string | null;
  issuedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
};

export const sessionsApi = {
  list: (params?: { scope?: "self" | "tenant"; active?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.scope) qs.set("scope", params.scope);
    if (params?.active) qs.set("active", "true");
    const q = qs.toString();
    return get<{ sessions: UserSessionRecord[]; self: string | null }>(`/sessions${q ? `?${q}` : ""}`);
  },
  revoke: (id: string) => del<{ session: UserSessionRecord }>(`/sessions/${id}`),
};

/* ─── Hardware (stampanti/display/rotte) ─────────── */

export type HardwareDeviceType =
  | "stampante_termica"
  | "stampante_fiscale"
  | "display_kds"
  | "lettore_keycard"
  | "cassetto_denaro"
  | "altro";

export type HardwareDeviceConnection = "tcp_ip" | "usb" | "bluetooth" | "hdmi" | "altro";

export type HardwareDeviceStatus = "online" | "offline" | "manutenzione";

export type HardwareDepartment =
  | "cucina"
  | "pizzeria"
  | "bar"
  | "cassa"
  | "sala"
  | "reception"
  | "housekeeping"
  | "magazzino"
  | "altro";

export type PrintRouteEvent =
  | "nuova_comanda"
  | "ordine_bevande"
  | "chiusura_conto"
  | "preconto"
  | "nota_cucina"
  | "keycard_emessa";

export type HardwareDevice = {
  id: string;
  tenantId: string;
  name: string;
  type: HardwareDeviceType;
  department: HardwareDepartment;
  connection: HardwareDeviceConnection;
  ipAddress: string | null;
  port: number | null;
  status: HardwareDeviceStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PrintRouteRecord = {
  id: string;
  tenantId: string;
  event: PrintRouteEvent;
  department: HardwareDepartment;
  deviceId: string;
  deviceName?: string;
  createdAt: string;
  updatedAt: string;
};

export const hardwareApi = {
  listDevices: () => get<HardwareDevice[]>("/hardware/devices"),
  createDevice: (data: {
    name: string;
    type?: HardwareDeviceType;
    department?: HardwareDepartment;
    connection?: HardwareDeviceConnection;
    ipAddress?: string | null;
    port?: number | null;
    status?: HardwareDeviceStatus;
    notes?: string;
  }) => post<HardwareDevice>("/hardware/devices", data),
  updateDevice: (
    id: string,
    data: Partial<{
      name: string;
      type: HardwareDeviceType;
      department: HardwareDepartment;
      connection: HardwareDeviceConnection;
      ipAddress: string | null;
      port: number | null;
      status: HardwareDeviceStatus;
      notes: string;
    }>,
  ) => put<HardwareDevice>(`/hardware/devices/${id}`, data),
  deleteDevice: (id: string) => del<{ deleted: boolean }>(`/hardware/devices/${id}`),
  listRoutes: () => get<PrintRouteRecord[]>("/hardware/routes"),
  createRoute: (data: { event: PrintRouteEvent; department: HardwareDepartment; deviceId: string }) =>
    post<PrintRouteRecord>("/hardware/routes", data),
  deleteRoute: (id: string) => del<{ deleted: boolean }>(`/hardware/routes/${id}`),
};

/* ─── AI chat ─────────────────────────────────────── */

export type AiChatLog = {
  id: string;
  context: string;
  userMessage: string;
  assistantMessage: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export const aiApi = {
  chat: (payload: {
    context: string;
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    enableTools?: boolean;
    locale?: string;
    stream?: boolean;
  }) => post<{ reply: string; actions?: string[] }>("/ai/chat", payload),
  history: (context?: string) => {
    const qs = context ? `?context=${encodeURIComponent(context)}` : "";
    return get<AiChatLog[]>(`/ai/history${qs}`);
  },
};

export type HotelRoomStatus = "libera" | "occupata" | "da_pulire" | "pulita" | "fuori_servizio" | "manutenzione";
export type HotelReservationStatus = "confermata" | "in_casa" | "check_out" | "cancellata" | "no_show";
export type HotelRoom = {
  id: string;
  code: string;
  floor: number;
  capacity: number;
  status: HotelRoomStatus;
  roomType: string;
  ratePlanCode?: string;
  defaultNightlyRate: number;
};
export type RatePlan = {
  id: string;
  code: string;
  name: string;
  roomType: string;
  boardType: "room_only" | "bed_breakfast" | "half_board" | "full_board";
  nightlyRate: number;
  refundable: boolean;
};
export type HotelReservation = {
  id: string;
  customerId: string;
  guestName: string;
  phone: string;
  email: string;
  roomId: string | null;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  status: HotelReservationStatus;
  roomType: string;
  boardType: "room_only" | "bed_breakfast" | "half_board" | "full_board";
  nights: number;
  rate: number;
  documentCode: string;
  nationality?: string;
  address?: string;
  company?: string;
  channel?: string;
  children?: number;
  crib?: boolean;
  lateCheckout?: boolean;
  earlyCheckin?: boolean;
  depositReceived?: number | null;
  receptionNotes?: string;
  packageName?: string;
  ratePlanName?: string;
};
export type HotelStay = { id: string; reservationId: string; roomId: string; actualCheckInAt: string | null; actualCheckOutAt: string | null };
export type HousekeepingTask = { id: string; roomId: string; assignedTo: string; status: "todo" | "in_progress" | "done"; scheduledFor: string; inspected: boolean };
export type HotelKeycard = { id: string; roomId: string; reservationId: string; validFrom: string; validUntil: string; status: "attiva" | "scaduta" | "annullata"; issuedBy: string };
export type GuestFolio = {
  id: string;
  tenantId: string;
  customerId: string;
  stayId: string | null;
  currency: string;
  balance: number;
  status: "open" | "closed";
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  guestName?: string | null;
  roomCode?: string | null;
  reservationId?: string | null;
};
export type FolioCharge = {
  id: string;
  folioId: string;
  source: "hotel" | "restaurant" | "manual" | "city_tax" | "payment" | "meal_plan_credit" | "room_service";
  sourceId: string | null;
  description: string;
  amount: number;
  postedAt: string;
  department?: string | null;
  operator?: string | null;
  quantity?: number;
  unitPrice?: number | null;
  vatPct?: number;
  section?: string | null;
  splitCode?: string;
  lineStatus?: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
};
export type FolioAuditLogEntry = {
  id: string;
  folioId: string;
  chargeId: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  userName: string | null;
  ip: string | null;
  createdAt: string;
};
export type FolioAttachmentEntry = {
  id: string;
  folioId: string;
  type: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};
export type FolioDetail = {
  folio: GuestFolio;
  charges: FolioCharge[];
  auditLogs: FolioAuditLogEntry[];
  attachments: FolioAttachmentEntry[];
};

/** Pagamento manuale reception (checkout hotel, senza Stripe). */
export type HotelManualPaymentMethod =
  | "contanti"
  | "carta"
  | "bonifico"
  | "altro"
  | "cash"
  | "card"
  | "room_charge_settlement";
export type UnifiedReportSnapshot = {
  range: { from: string | null; to: string | null };
  occupancy: { occupiedRooms: number; totalRooms: number };
  arrivalsToday: number;
  departuresToday: number;
  hotelRevenue: number;
  restaurantRevenue: number;
  integratedRoomChargeRevenue: number;
  openFolios: number;
  realCosts?: {
    foodCost: number;
    staffCost: number;
    totalCost: number;
    margin: number;
  };
  staffOps?: {
    totalHours: number;
    activeShifts: number;
  };
  boardMix: {
    room_only: number;
    bed_breakfast: number;
    half_board: number;
    full_board: number;
  };
};
export type DailyClosureReport = {
  id: string;
  date: string;
  foodSpend: number;
  staffSpend: number;
  revenue: number;
  notes: string;
};
export type ReportTrendPeriod = {
  revenue: number;
  costs: number;
  margin: number;
  reportsCount: number;
  deltaRevenuePct: number | null;
};
export type ReportTrendsSnapshot = {
  day: ReportTrendPeriod;
  week: ReportTrendPeriod;
  month: ReportTrendPeriod;
  forecast: {
    next7: {
      horizonDays: number;
      projectedRevenue: number;
      projectedCosts: number;
      projectedMargin: number;
      confidence: "low" | "medium" | "high";
    };
    next30: {
      horizonDays: number;
      projectedRevenue: number;
      projectedCosts: number;
      projectedMargin: number;
      confidence: "low" | "medium" | "high";
    };
  };
};

export const hotelApi = {
  availability: (params: { roomType: string; checkInDate: string; checkOutDate: string }) => {
    const qs = new URLSearchParams(params);
    return get<{ roomType: string; checkInDate: string; checkOutDate: string; availableCount: number; rooms: HotelRoom[]; ratePlans: RatePlan[] }>(`/hotel/availability?${qs.toString()}`);
  },
  listRooms: () => get<HotelRoom[]>("/hotel/rooms"),
  createRoom: (data: Omit<HotelRoom, "id">) => post<HotelRoom>("/hotel/rooms", data),
  updateRoom: (id: string, data: Partial<HotelRoom>) => put<HotelRoom>(`/hotel/rooms/${id}`, data),
  deleteRoom: (id: string) => del<{ deleted: boolean }>(`/hotel/rooms/${id}`),
  listReservations: () => get<HotelReservation[]>("/hotel/reservations"),
  createReservation: (data: Omit<HotelReservation, "id">) => post<HotelReservation>("/hotel/reservations", data),
  updateReservation: (id: string, data: Partial<HotelReservation>) => put<HotelReservation>(`/hotel/reservations/${id}`, data),
  deleteReservation: (id: string) => del<{ deleted: boolean }>(`/hotel/reservations/${id}`),
  checkIn: (reservationId: string, roomId: string) =>
    post<{ reservation: HotelReservation; room: HotelRoom; stay: HotelStay; card: HotelKeycard }>("/hotel/front-desk/check-in", { reservationId, roomId }),
  recordFolioPayment: (reservationId: string, amount: number, method: HotelManualPaymentMethod, note?: string) =>
    post<{ folio: GuestFolio; charges: FolioCharge[]; balance: number }>("/hotel/front-desk/payment", {
      reservationId,
      amount,
      method,
      note,
    }),
  checkOut: (
    reservationId: string,
    cityTaxAmount = 0,
    paymentMethod: "cash" | "card" | "room_charge_settlement" | HotelManualPaymentMethod = "card",
    options?: { allowResidual?: boolean; implicitFullPayment?: boolean },
  ) =>
    post<{
      reservation: HotelReservation;
      room: HotelRoom;
      stay: HotelStay | null;
      housekeepingTask: HousekeepingTask;
      keycards: HotelKeycard[];
      folio: { folio: GuestFolio; charges: FolioCharge[]; settlement: FolioCharge | null } | null;
    }>("/hotel/front-desk/check-out", {
      reservationId,
      cityTaxAmount,
      paymentMethod,
      allowResidual: options?.allowResidual,
      implicitFullPayment: options?.implicitFullPayment,
    }),
  listHousekeeping: () => get<HousekeepingTask[]>("/hotel/housekeeping"),
  listKeycards: () => get<HotelKeycard[]>("/hotel/keycards"),
  listRatePlans: (roomType?: string) =>
    get<RatePlan[]>(roomType ? `/hotel/rate-plans?roomType=${encodeURIComponent(roomType)}` : "/hotel/rate-plans"),
};

export type HousekeepingPmsCode =
  | "VC" | "VD" | "OC" | "OD" | "INSPECTED" | "CLEAN" | "DIRTY" | "PICKUP" | "TOUCHED"
  | "OOO" | "OOS" | "MAINTENANCE" | "BLOCKED" | "VIP_READY" | "DND" | "LATE_CO" | "EARLY_ARR";

export type HkRoomBoardItem = {
  id: string;
  code: string;
  floor: number;
  roomType: string;
  capacity: number;
  status: HotelRoom["status"];
  pmsCode: HousekeepingPmsCode;
  pmsLabel: string;
  colorClass: string;
  occupied: boolean;
  guestName: string | null;
  arrival: string | null;
  departure: string | null;
  priority: number;
  estimatedCleanMin: number;
  doNotDisturb: boolean;
  vipReady: boolean;
  isBlocked: boolean;
  maintenance: boolean;
  taskId: string | null;
  taskStatus: string | null;
};

export type HkDashboard = {
  kpi: {
    occupied: number;
    vacant: number;
    arrivalsToday: number;
    departuresToday: number;
    dirty: number;
    clean: number;
    inspected: number;
    ready: number;
    outOfOrder: number;
    blocked: number;
    maintenance: number;
    priority: number;
    avgCleanMin: number;
    activeHousekeepers: number;
    openTasks: number;
    completedTasks: number;
    readyPct: number;
  };
  roomBoard: HkRoomBoardItem[];
  ai: {
    suggestions: Array<{ id: string; type: string; title: string; detail: string; roomCodes?: string[]; priority: string }>;
    optimalOrder: string[];
    delayRiskRooms: string[];
    inspectQueue: string[];
    summary: string;
  };
  generatedAt: string;
};

export const housekeepingApi = {
  dashboard: () => get<HkDashboard>("/hotel/housekeeping/dashboard"),
  createTask: (payload: { roomId: string; taskType?: string; priority?: string; assignedToUserId?: string }) =>
    post<{ task: unknown }>("/hotel/housekeeping/tasks", payload),
  updateTask: (taskId: string, payload: Record<string, unknown>) =>
    patch<{ task: unknown }>(`/hotel/housekeeping/tasks/${taskId}`, payload),
  updateRoom: (roomId: string, payload: { hkPmsCode?: HousekeepingPmsCode; doNotDisturb?: boolean; vipReady?: boolean; hkPriority?: number }) =>
    patch<{ room: unknown }>(`/hotel/housekeeping/rooms/${roomId}`, payload),
  listMaintenance: () => get<{ tickets: unknown[] }>("/hotel/housekeeping/maintenance"),
  createMaintenance: (payload: { roomId: string; title: string; description?: string; priority?: string }) =>
    post<{ ticket: unknown }>("/hotel/housekeeping/maintenance", payload),
  updateMaintenance: (id: string, payload: Record<string, unknown>) =>
    patch<{ ticket: unknown }>(`/hotel/housekeeping/maintenance/${id}`, payload),
  analytics: (days = 7) => get<Record<string, unknown>>(`/hotel/housekeeping/analytics?days=${days}`),
  audit: (limit = 50) => get<{ logs: unknown[] }>(`/hotel/housekeeping/audit?limit=${limit}`),
  checklists: () => get<{ templates: unknown[] }>("/hotel/housekeeping/checklists"),
};

export const integrationApi = {
  listFolios: () => get<GuestFolio[]>("/integration/folios"),
  listCharges: () => get<FolioCharge[]>("/integration/charges"),
  chargeRoom: (reservationId: string, orderId: string, description: string, amount: number, serviceType: "breakfast" | "lunch" | "dinner") =>
    post<{ folio: GuestFolio; charge: FolioCharge; credits: FolioCharge[] }>("/integration/room-charge", { reservationId, orderId, description, amount, serviceType }),
};

export const hotelFolioApi = {
  getDetail: (folioId: string) => get<FolioDetail>(`/hotel/folio/${folioId}`),
  postCharge: (payload: {
    folioId: string;
    description: string;
    amount: number;
    source?: FolioCharge["source"];
    department?: string;
    section?: string;
    quantity?: number;
    unitPrice?: number;
    vatPct?: number;
    splitCode?: string;
  }) => post<{ charge: FolioCharge }>("/hotel/folio/charges", payload),
  patchCharge: (
    chargeId: string,
    action: "transfer" | "split" | "void",
    extra?: { targetFolioId?: string; splitCode?: string },
  ) => patch<{ success: boolean }>(`/hotel/folio/charges/${chargeId}`, { action, ...extra }),
  lock: (folioId: string) => post<{ locked: boolean }>(`/hotel/folio/${folioId}/lock`, {}),
  unlock: (folioId: string) => post<{ locked: boolean }>(`/hotel/folio/${folioId}/unlock`, {}),
  uploadAttachment: (
    folioId: string,
    payload: { type: string; fileName: string; mimeType: string; dataBase64: string },
  ) => post<{ attachment: FolioAttachmentEntry }>(`/hotel/folio/${folioId}/attachments`, payload),
  exportPdf: (folioId: string) => fetchBlob(`/hotel/folio/${folioId}/export?format=pdf`),
  exportCsv: (folioId: string) => fetchBlob(`/hotel/folio/${folioId}/export?format=csv`),
  exportExcel: (folioId: string) => fetchBlob(`/hotel/folio/${folioId}/export?format=xlsx`),
  email: (folioId: string, toEmail: string, subject?: string) =>
    post<{ sent: boolean }>(`/hotel/folio/${folioId}/email`, { toEmail, subject }),
  merge: (sourceFolioId: string, targetFolioId: string) =>
    post<{ merged: boolean }>("/hotel/folio/merge", { sourceFolioId, targetFolioId }),
  transferBatch: (chargeIds: string[], targetFolioId: string) =>
    post<{ transferred: number }>("/hotel/folio/transfer-batch", { chargeIds, targetFolioId }),
  getBilling: (folioId: string) =>
    get<{
      assignments: Array<{
        id: string;
        companyName: string;
        billingMode: string;
        splitCode: string;
        creditLimit: number;
        outstandingBalance: number;
      }>;
      splits: Array<{ id: string; code: string; label: string }>;
      emailLogs: Array<{ id: string; toEmail: string; status: string; sentAt: string }>;
      mergeLogs: Array<{ id: string; sourceFolioId: string; targetFolioId: string; createdAt: string }>;
    }>(`/hotel/folio/${folioId}/billing`),
  listCompanies: () => get<{ companies: Array<{ id: string; name: string; vatNumber: string | null; creditLimit: number }> }>("/hotel/folio/companies"),
  assignCompany: (folioId: string, companyId: string, billingMode?: string) =>
    post(`/hotel/folio/${folioId}/billing`, { companyId, billingMode }),
};

export type FolioAiSeverity = "critical" | "warning" | "info";

export type FolioAiAnomaly = {
  id: string;
  severity: FolioAiSeverity;
  category: string;
  title: string;
  detail: string;
  suggestion?: string;
  chargeIds?: string[];
};

export type FolioAiAnalysis = {
  folioId: string;
  generatedAt: string;
  anomalies: FolioAiAnomaly[];
  revenueSuggestions: Array<{ id: string; service: string; reason: string; estimatedValue?: number; priority: string }>;
  guestSummary: {
    stayOverview: string;
    spending: { total: number; room: number; extras: number; paid: number; balance: number };
    preferences: string[];
    history: string;
    vip: boolean;
    allergies: string[];
    specialRequests: string[];
    issues: string[];
  };
  paymentAssistant: {
    balance: number;
    credit: number;
    paidTotal: number;
    dueTotal: number;
    paymentCount: number;
    suggestedActions: string[];
    splitSummary: Record<string, number>;
  };
  checkoutChecklist: Array<{ id: string; label: string; status: "ok" | "warn" | "fail"; detail: string }>;
  fraudAlerts: Array<{ id: string; type: string; severity: FolioAiSeverity; detail: string }>;
  customerInsights: {
    avgSpend: number;
    visitFrequency: string;
    preferences: string[];
    servicesUsed: string[];
    customerValue: string;
    returnProbability: number;
  };
  forecast: {
    projectedFinalSpend: number;
    estimatedRevenue: number;
    upsellProbability: number;
    notes: string[];
  };
  timeline: Array<{ id: string; at: string; kind: string; title: string; detail: string; amount?: number; aiSummary?: string }>;
  checkoutBlocked: boolean;
  checkoutBlockReasons: string[];
  proposedActions: FolioAiProposedAction[];
};

export type FolioAiProposedAction = {
  id: string;
  type: "payment" | "note" | "checkout" | "email" | "pdf" | "charge";
  label: string;
  description: string;
  payload?: Record<string, unknown>;
  requiresConfirmation: true;
};

export const hotelFolioAiApi = {
  analyze: (folioId: string, locale = "it") =>
    get<FolioAiAnalysis>(`/hotel/folio/${folioId}/ai/analyze?locale=${encodeURIComponent(locale)}`),
  chat: (folioId: string, message: string, history?: Array<{ role: "user" | "assistant"; content: string }>, locale = "it") =>
    post<{ reply: string }>(`/hotel/folio/${folioId}/ai/chat`, { message, history, locale }),
  explainCharge: (folioId: string, chargeId: string) =>
    get<{ explanation: { narrative: string; origin: string; department: string; operator: string; date: string; time: string; vatPct: number; total: number } }>(
      `/hotel/folio/${folioId}/ai/chat?chargeId=${encodeURIComponent(chargeId)}`,
    ),
  confirmAction: (folioId: string, actionId: string, actionType: string) =>
    post<{ acknowledged: boolean; message: string }>(`/hotel/folio/${folioId}/ai/actions`, {
      actionId,
      actionType,
      confirmed: true,
    }),
  getReport: (folioId: string) => get<Record<string, unknown>>(`/hotel/folio/${folioId}/ai/report`),
  downloadReport: (folioId: string, format: "pdf" | "json" = "pdf") =>
    fetchBlob(`/hotel/folio/${folioId}/ai/report?format=${format}`),
};

export type GuestRegisterEntryStatus = "draft" | "incomplete" | "complete" | "checked_out";
export type GuestRegisterTransmissionStatus = "pending" | "sent" | "error" | "cancelled";
export type GuestRegisterCountry = "IT" | "NL" | "BE" | "DE" | "FR" | "ES";
export type GuestRegisterPersonSex = "M" | "F" | "X" | "unknown";
export type GuestRegisterDocumentType = "passport" | "identity_card" | "driving_license" | "visa" | "other";
export type GuestRegisterAttachmentType =
  | "document_front"
  | "document_back"
  | "passport"
  | "visa"
  | "driving_license"
  | "receipt"
  | "contract"
  | "signature_privacy"
  | "signature_checkin"
  | "signature_rules";
export type GuestRegisterOcrStatus = "none" | "pending" | "completed" | "verified" | "failed";

export type GuestRegisterPerson = {
  id: string;
  entryId: string;
  firstName: string;
  lastName: string;
  sex: GuestRegisterPersonSex;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  stateOfBirth: string | null;
  nationality: string | null;
  residenceCountry: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  taxCode: string | null;
  phone: string | null;
  email: string | null;
  documentType: GuestRegisterDocumentType | null;
  documentNumber: string | null;
  documentIssueDate: string | null;
  documentExpiryDate: string | null;
  documentIssuingAuthority: string | null;
  isPrimary: boolean;
  sortOrder: number;
  isComplete: boolean;
  ocrStatus: GuestRegisterOcrStatus;
  ocrPayload: Record<string, unknown> | null;
  ocrVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuestRegisterEntry = {
  id: string;
  tenantId: string;
  reservationId: string;
  stayId: string | null;
  roomId: string | null;
  status: GuestRegisterEntryStatus;
  transmissionStatus: GuestRegisterTransmissionStatus;
  transmissionCountry: GuestRegisterCountry;
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  adults: number;
  children: number;
  roomCode: string | null;
  notes: string | null;
  lastTransmissionAt: string | null;
  createdAt: string;
  updatedAt: string;
  guestName?: string | null;
  reservationStatus?: string | null;
};

export type GuestRegisterEntryDetail = GuestRegisterEntry & {
  persons: GuestRegisterPerson[];
  attachments: { id: string; entryId: string; personId: string | null; type: GuestRegisterAttachmentType; fileName: string; mimeType: string; fileSize: number; createdAt: string }[];
  transmissions: { id: string; entryId: string; country: GuestRegisterCountry; adapterCode: string; status: GuestRegisterTransmissionStatus; errorMessage: string | null; externalRef: string | null; sentAt: string | null; createdAt: string }[];
  auditLogs: { id: string; entryId: string | null; personId: string | null; action: string; userName: string | null; ip: string | null; createdAt: string }[];
};

export type GuestRegisterDashboard = {
  date: string;
  arrivalsToday: number;
  departuresToday: number;
  guestsPresent: number;
  toRegister: number;
  incomplete: number;
  sent: number;
  transmissionErrors: number;
  nationalityBreakdown: { nationality: string; count: number }[];
  statusBreakdown: { status: GuestRegisterEntryStatus; count: number }[];
  transmissionBreakdown: { status: GuestRegisterTransmissionStatus; count: number }[];
};

export const hotelGuestRegisterApi = {
  dashboard: (date?: string) => get<GuestRegisterDashboard>(`/hotel/guest-register/dashboard${date ? `?date=${date}` : ""}`),
  search: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") qs.set(k, String(v));
    }
    return get<{ items: GuestRegisterEntry[]; total: number; page: number; pageSize: number }>(`/hotel/guest-register/search?${qs}`);
  },
  getEntry: (id: string) => get<GuestRegisterEntryDetail>(`/hotel/guest-register/entries/${id}`),
  createEntry: (reservationId: string) => post<{ entry: GuestRegisterEntry }>("/hotel/guest-register/entries", { reservationId }),
  updateEntry: (id: string, data: Partial<{ transmissionCountry: GuestRegisterCountry; notes: string | null }>) =>
    patch<{ entry: GuestRegisterEntry }>(`/hotel/guest-register/entries/${id}`, data),
  addPerson: (entryId: string, data: Partial<GuestRegisterPerson>) =>
    post<{ person: GuestRegisterPerson }>(`/hotel/guest-register/entries/${entryId}/persons`, data),
  updatePerson: (personId: string, data: Partial<GuestRegisterPerson>) =>
    patch<{ person: GuestRegisterPerson }>(`/hotel/guest-register/persons/${personId}`, data),
  deletePerson: (personId: string) => del<{ deleted: boolean }>(`/hotel/guest-register/persons/${personId}`),
  uploadAttachment: (personId: string, payload: { type: GuestRegisterAttachmentType; fileName: string; mimeType: string; dataBase64: string }) =>
    post<{ attachment: unknown }>(`/hotel/guest-register/persons/${personId}/attachments`, payload),
  runOcr: (personId: string, payload: { dataBase64: string; mimeType: string; fileName: string }) =>
    post<{ extracted: Record<string, unknown>; person: GuestRegisterPerson }>(`/hotel/guest-register/persons/${personId}/ocr`, payload),
  verifyOcr: (personId: string, applyOcr?: boolean) =>
    patch<{ person: GuestRegisterPerson }>(`/hotel/guest-register/persons/${personId}/ocr/verify`, { applyOcr }),
  transmit: (entryId: string, country?: GuestRegisterCountry) =>
    post<{ transmission: unknown }>(`/hotel/guest-register/entries/${entryId}/transmit`, { country }),
  sync: (date?: string) => post<{ synced: number }>(`/hotel/guest-register/sync${date ? `?date=${date}` : ""}`, {}),
  listAdapters: () => get<{ adapters: { code: string; country: GuestRegisterCountry; name: string }[] }>("/hotel/guest-register/adapters"),
  attachmentUrl: (attachmentId: string) => `/api/hotel/guest-register/attachments/${attachmentId}`,
};

export const reportsApi = {
  unified: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    return get<UnifiedReportSnapshot>(`/reports/unified${qs.toString() ? `?${qs.toString()}` : ""}`);
  },
  daily: {
    list: (params?: { from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      return get<DailyClosureReport[]>(`/reports/daily${qs.toString() ? `?${qs.toString()}` : ""}`);
    },
    upsert: (payload: { date: string; foodSpend: number; staffSpend: number; revenue: number; notes?: string }) =>
      post<DailyClosureReport>("/reports/daily", payload),
  },
  trends: () => get<ReportTrendsSnapshot>("/reports/trends"),
};

export type AiProposalType =
  | "food_cost"
  | "warehouse"
  | "menu"
  | "pricing"
  | "manager_report"
  | "reorder"
  | "hotel_bridge";
export type AiProposalStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "applied"
  | "cancelled";
export type AiProposal = {
  id: string;
  tenantId: string;
  createdBy: string;
  type: AiProposalType;
  status: AiProposalStatus;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type KitchenOperationalSnapshot = {
  periodDays: number;
  generatedAt: string;
  foodCost: Array<{
    menuItemId: string;
    menuItem: string;
    recipeId: string;
    recipeName: string;
    price: number;
    plateCost: number;
    marginValue: number;
    marginPct: number;
    actualFoodCostPct: number;
    targetFoodCostPct: number;
    suggestedPrice: number;
    status: "healthy" | "low_margin" | "loss";
    demandQty: number;
    note: string;
  }>;
  warehouse: {
    stagnantProducts: Array<{
      warehouseItemId: string;
      name: string;
      qty: number;
      unit: string;
      daysWithoutMovement: number;
      suggestion: string;
    }>;
    expiringProducts: Array<{
      lotId: string;
      warehouseItemId: string;
      name: string;
      qtyRemaining: number;
      unit: string;
      expiresAt: string;
      daysToExpire: number;
      suggestion: string;
    }>;
  };
  menuGenerator: {
    dailyMenu: Array<{ menuItemId: string; name: string; category: string; score: number; reason: string }>;
    seasonalMenu: Array<{ menuItemId: string; name: string; category: string; score: number; reason: string }>;
  };
  dynamicPricing: Array<{
    menuItemId: string;
    menuItem: string;
    currentPrice: number;
    suggestedPrice: number;
    deltaPct: number;
    reason: string;
  }>;
  managerReport: {
    estimatedRevenue: number;
    averageMarginPct: number;
    estimatedWasteValue: number;
    topDishes: Array<{ name: string; qty: number; revenue: number }>;
    dishesToRemove: Array<{ menuItem: string; demandQty: number; marginPct: number; reason: string }>;
    dailyLossEstimate: number;
    headline: string;
  };
  reorder: Array<{
    warehouseItemId: string;
    name: string;
    qty: number;
    unit: string;
    minStock: number;
    avgDailyConsumption: number;
    suggestedOrderQty: number;
    eta: string;
    reason: string;
  }>;
  hotelBridge: {
    breakfastCoversTomorrow: number;
    halfBoardGuestsTomorrow: number;
    fullBoardGuestsTomorrow: number;
    notes: string[];
  };
  kpi: {
    lowMarginDishes: number;
    lossDishes: number;
    expiringLots: number;
    stagnantProducts: number;
  };
};

export type CantinaAiSnapshot = {
  generatedAt: string;
  kpi: {
    totalLabels: number;
    totalStock: number;
    totalStockValue: number;
    avgMarginPct: number;
    lowStockCount: number;
    outOfStockCount: number;
    highMarginCount: number;
    lowMarginCount: number;
    oldVintageCount: number;
  };
  lowStockAlerts: Array<{
    id: string;
    name: string;
    producer: string;
    stock: number;
    sellingPrice: number;
    suggestion: string;
  }>;
  outOfStock: Array<{
    id: string;
    name: string;
    producer: string;
    sellingPrice: number;
    suggestion: string;
  }>;
  marginAnalysis: Array<{
    id: string;
    name: string;
    producer: string;
    purchasePrice: number;
    sellingPrice: number;
    marginPct: number;
    status: "excellent" | "good" | "low" | "loss";
    suggestion: string;
  }>;
  pricingSuggestions: Array<{
    id: string;
    name: string;
    currentPrice: number;
    suggestedPrice: number;
    reason: string;
  }>;
  salesRecommendations: Array<{
    id: string;
    name: string;
    producer: string;
    reason: string;
    priority: "high" | "medium" | "low";
  }>;
  vintageAlerts: Array<{
    id: string;
    name: string;
    vintageYear: number;
    age: number;
    suggestion: string;
  }>;
  colorDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
};

export const aiOpsApi = {
  kitchenOperationalInsights: (days = 14) =>
    get<KitchenOperationalSnapshot>(`/ai/kitchen/insights?mode=operational&days=${days}`),
  cantinaInsights: () => get<CantinaAiSnapshot>("/ai/cantina"),
  proposals: {
    list: (params?: { status?: AiProposalStatus; type?: AiProposalType; limit?: number; open?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.type) qs.set("type", params.type);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.open) qs.set("open", "true");
      return get<{ proposals: AiProposal[] }>(`/ai/proposals${qs.toString() ? `?${qs.toString()}` : ""}`);
    },
    generate: (payload?: { days?: number; status?: "draft" | "pending_review"; enrich?: boolean }) =>
      post<{ snapshot: KitchenOperationalSnapshot; proposals: AiProposal[]; generated: number; source?: string }>(
        "/ai/proposals/generate",
        payload || {},
      ),
    review: (id: string, payload: { action: "approve" | "reject" | "cancel"; notes?: string }) =>
      patch<{ proposal: AiProposal }>(`/ai/proposals/${id}/review`, payload),
    apply: (id: string, payload?: { notes?: string }) =>
      post<{ proposal: AiProposal | null }>(`/ai/proposals/${id}/apply`, payload || {}),
  },
  decisions: {
    generate: (payload?: {
      domains?: string[];
      periodDays?: number;
      locale?: string;
      persist?: boolean;
      enrich?: boolean;
      status?: "draft" | "pending_review";
    }) => post<{ generatedAt: string; periodDays: number; decisions: unknown[]; source: string }>(
      "/ai/decisions/generate",
      payload || {},
    ),
    domain: (domain: string, params?: { enrich?: boolean; periodDays?: number; locale?: string }) => {
      const qs = new URLSearchParams();
      if (params?.enrich === false) qs.set("enrich", "false");
      if (params?.periodDays) qs.set("periodDays", String(params.periodDays));
      if (params?.locale) qs.set("locale", params.locale);
      return get<unknown>(`/ai/decisions/${domain}${qs.toString() ? `?${qs.toString()}` : ""}`);
    },
  },
  orchestrator: {
    ask: (payload: {
      query: string;
      locale?: string;
      periodDays?: number;
      enrich?: boolean;
      contextHint?: string;
      stream?: boolean;
    }) =>
      post<{
        reply: string;
        generatedAt: string;
        plan: { modules: string[]; reasoning: string; source: string };
        modules: unknown[];
        ragUsed: boolean;
        source: string;
      }>("/ai/orchestrator", payload),
  },
  vision: {
    tasks: () =>
      get<{
        tasks: Array<{ type: string; label: string; integrations: string[] }>;
      }>("/ai/vision"),
    analyze: (payload: {
      taskType: string;
      image: string;
      locale?: string;
      hints?: string;
      mimeType?: string;
    }) =>
      post<{
        taskType: string;
        generatedAt: string;
        tenantId: string;
        analysis: unknown;
        integrations: unknown[];
        source: string;
        valid: boolean;
        validationErrors: string[];
      }>("/ai/vision", payload),
    analyzeType: (
      type: string,
      payload: { image: string; locale?: string; hints?: string; mimeType?: string },
    ) =>
      post<{
        taskType: string;
        generatedAt: string;
        analysis: unknown;
        integrations: unknown[];
        source: string;
        valid: boolean;
      }>(`/ai/vision/${type}`, payload),
  },
  voice: {
    createSession: (payload?: { locale?: string }) =>
      post<{ sessionId: string; locale: string; createdAt: string }>("/ai/voice/session", payload || {}),
    getSession: (id: string) =>
      get<{ sessionId: string; locale: string; turns: unknown[]; updatedAt: string }>(
        `/ai/voice/session/${id}`,
      ),
    turn: (payload: { sessionId: string; transcript: string; locale?: string; stream?: boolean }) =>
      post<{
        sessionId: string;
        reply: string;
        plan: unknown;
        modulesUsed: string[];
        actions: string[];
        source: string;
      }>("/ai/voice/turn", payload),
    tts: (payload: { text: string; locale?: string }) =>
      post<{ audioBase64: string; mimeType: string; voice: string }>("/ai/voice/tts", payload),
  },
};

export type CommandCenterFilters = {
  module?: string;
  periodDays?: number;
  userId?: string;
  workflowId?: string;
  automationModule?: string;
};

export type CommandCenterDashboard = {
  generatedAt: string;
  tenantId: string;
  filters: CommandCenterFilters;
  status: {
    online: boolean;
    provider: string;
    model: string;
    streamingActive: boolean;
    ragActive: boolean;
    vectorDbActive: boolean;
    memoryActive: boolean;
    automationActive: boolean;
    schedulerActive: boolean;
    lastHeartbeat: string;
  };
  kpis: Record<string, number>;
  savings: Record<string, number>;
  timeline: Array<{ id: string; at: string; level: string; message: string; module?: string }>;
  workflowsLive: Array<{
    id: string;
    status: string;
    module: string;
    userId: string;
    tenantId: string;
    startedAt: string;
    elapsedMs: number;
    currentStep: string;
    progressPct: number;
  }>;
  automations: Array<{
    module: string;
    enabled: boolean;
    level: number;
    triggers: string[];
    lastRunAt: string | null;
    nextRunEstimate: string | null;
    avgDurationMs: number;
    lastOutcome: string | null;
  }>;
  decisions: Array<{
    id: string;
    module: string;
    decision: string;
    motivation: string;
    confidence: number | null;
    dataSources: string[];
    ruleBased: boolean;
    openAi: boolean;
    rag: boolean;
    status: string;
    createdAt: string;
  }>;
  health: Array<{ id: string; label: string; status: string; detail: string }>;
  stats: Record<string, Array<{ date: string; value: number }>>;
  logs: Array<{ id: string; at: string; level: string; module: string; message: string; userId?: string }>;
};

export const aiCommandCenterApi = {
  dashboard: (filters?: CommandCenterFilters) => {
    const qs = new URLSearchParams();
    if (filters?.module) qs.set("module", filters.module);
    if (filters?.periodDays) qs.set("periodDays", String(filters.periodDays));
    if (filters?.userId) qs.set("userId", filters.userId);
    if (filters?.workflowId) qs.set("workflowId", filters.workflowId);
    if (filters?.automationModule) qs.set("automationModule", filters.automationModule);
    return get<CommandCenterDashboard>(`/ai/command-center/dashboard${qs.toString() ? `?${qs}` : ""}`);
  },
  exportUrl: (params: CommandCenterFilters & { format: "csv" | "pdf" }) => {
    const qs = new URLSearchParams({ format: params.format });
    if (params.periodDays) qs.set("periodDays", String(params.periodDays));
    if (params.module) qs.set("module", params.module);
    return `/api/ai/command-center/export?${qs.toString()}`;
  },
  automationRuns: (limit = 50) => get<{ runs: unknown[] }>(`/ai/automation/runs?limit=${limit}`),
  automationConfig: () => get<{ configs: unknown[] }>("/ai/automation/config"),
  updateAutomationConfig: (payload: {
    module: string;
    enabled?: boolean;
    level?: 1 | 2 | 3;
    role?: string | null;
  }) => patch<{ config: unknown }>("/ai/automation/config", payload),
};

export type AiMemoryProfile = {
  id: string;
  tenantId: string;
  userId: string;
  preferences: Record<string, unknown>;
  lastContext: string | null;
  summary: string | null;
  updatedAt: string;
};

export const aiMemoryApi = {
  profile: () => get<AiMemoryProfile>("/ai/memory/profile"),
  updateProfile: (payload: {
    preferences?: Record<string, unknown>;
    lastContext?: string;
    summary?: string;
  }) => patch<AiMemoryProfile>("/ai/memory/profile", payload),
};

export type BillingSubscription = {
  id: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  priceId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
};

export type BillingEvent = {
  id: string;
  stripeEventId: string;
  type: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
};

export type BillingReadinessCheck = {
  key: string;
  ok: boolean;
  message: string;
};

export type BillingReadiness = {
  overallReady: boolean;
  integrationReady: boolean;
  tenantReady: boolean;
  runtimeEnvironment: "production" | "non_production";
  stripeMode: "live" | "test" | "unknown";
  envChecks: BillingReadinessCheck[];
  tenantChecks: BillingReadinessCheck[];
  tenantSummary: {
    id: string;
    plan: string;
    enabledFeatures: string[];
    licenseStatus: string | null;
    seats: number | null;
    usedSeats: number | null;
  } | null;
  subscription: {
    status: string;
    priceId: string | null;
    stripeCustomerId: string | null;
    currentPeriodEnd: string | null;
  } | null;
  recentBillingFailures: number;
  nextActions: string[];
};

export const billingApi = {
  overview: () =>
    get<{
      subscription: BillingSubscription | null;
      events: BillingEvent[];
    }>("/billing/overview"),
  checkout: (payload: { plan: "restaurant_only" | "hotel_only" | "all_included"; billingCycle: "monthly" | "annual" }) =>
    post<{ id: string; url: string }>("/billing/checkout", payload),
  portal: () => post<{ id: string; url: string }>("/billing/portal", {}),
  readiness: () => get<BillingReadiness>("/billing/readiness"),
  reconcile: () => post<{ reconciled: boolean; reason?: string; plan?: string; seats?: number }>("/billing/reconcile", {}),
};

export const api = {
  auth: {
    me: () => get<AuthUser>("/auth/me"),
    login: (username: string, password: string) => post<{ user: AuthUser }>("/auth/login", { username, password }),
    refresh: () => post<{ user: AuthUser }>("/auth/refresh", {}),
    logout: () => post<{ ok: boolean }>("/auth/logout", {}),
    changePassword: (currentPassword: string, newPassword: string) =>
      post<{ success: boolean }>("/auth/change-password", { currentPassword, newPassword }),
  },
  admin: {
    platform: {
      get: () => get<AdminPlatformConfig>("/admin/platform"),
      setMaintenanceMode: (maintenanceMode: boolean) => patch<AdminPlatformConfig>("/admin/platform", { maintenanceMode }),
    },
    system: {
      get: () => get<AdminSystemSnapshot>("/admin/system"),
    },
    tenants: {
      list: () => get<AdminTenant[]>("/admin/tenants"),
      setAccess: (tenantId: string, status: "active" | "blocked") => patch<AdminTenant>(`/admin/tenants/${tenantId}`, { status }),
      create: (payload: {
        name: string;
        slug: string;
        plan: "restaurant_only" | "hotel_only" | "all_included";
        billingCycle?: "monthly" | "annual";
        seats?: number;
        licenseDurationMonths?: number;
        partnerCode?: string;
        adminUser: {
          username: string;
          email: string;
          name: string;
          password: string;
          role?: string;
        };
      }) => post<AdminTenantOnboardingResult>("/admin/tenants", payload),
      bootstrap: (tenantId: string) => post<AdminTenantBootstrapResult>(`/admin/tenants/${tenantId}/bootstrap`, {}),
    },
    licenses: {
      list: () => get<AdminLicense[]>("/admin/licenses"),
      setStatus: (id: string, status: AdminLicense["status"]) => patch<AdminLicense>(`/admin/licenses/${id}`, { status }),
    },
    emailConfig: {
      list: () => get<AdminEmailConfig[]>("/admin/email-config"),
      save: (tenantId: string, payload: { host: string; port: number; username: string; password: string; fromAddress: string; secure: boolean }) =>
        put<AdminEmailConfig>(`/admin/email-config/${tenantId}`, payload),
      test: (tenantId: string, to?: string) =>
        post<AdminEmailConfig & { messageId?: string; recipient?: string; error?: string }>(
          `/admin/email-config/${tenantId}/test`,
          to ? { to } : {},
        ),
    },
    users: {
      list: () => get<AdminUser[]>("/admin/users"),
      unlock: (id: string) => post<{ user: AdminUser }>(`/admin/users/${id}/unlock`, {}),
      generateTempPassword: (id: string) => post<{ user: AdminUser; temporaryPassword: string }>(`/admin/users/${id}/temp-password`, {}),
      forceChangePassword: (id: string) => post<{ user: AdminUser }>(`/admin/users/${id}/force-change-password`, {}),
      create: (payload: { username: string; name: string; email: string; password: string; role: string; tenantId?: string }) =>
        post<{ user: AdminUser; password: string }>("/admin/users", payload),
      toggleActive: (id: string) => patch<{ user: AdminUser }>(`/admin/users/${id}`, { toggleActive: true }),
    },
    aiConfig: {
      get: () => get<AiConfigCenterPayload>("/admin/ai-config"),
      update: (body: Record<string, boolean | number | string>) =>
        patch<AiConfigCenterPayload>("/admin/ai-config", body),
      ragAction: (action: string) =>
        post<{ success: boolean; action: string; upserted?: number; removed?: number }>(
          "/admin/ai-config/rag",
          { action },
        ),
    },
    aiControl: {
      get: (params?: { tenantId?: string; q?: string }) => {
        const qs = new URLSearchParams();
        if (params?.tenantId) qs.set("tenantId", params.tenantId);
        if (params?.q) qs.set("q", params.q);
        const suffix = qs.toString() ? `?${qs}` : "";
        return get<AiEnterpriseControlPayload>(`/admin/ai-control${suffix}`);
      },
      createAgent: (body: Record<string, unknown>) => post<{ agent: unknown }>("/admin/ai-control/agents", body),
      updateAgent: (body: Record<string, unknown>) => patch<{ agent: unknown }>("/admin/ai-control/agents", body),
      deleteAgent: (id: string) => del<{ success: boolean }>(`/admin/ai-control/agents?id=${encodeURIComponent(id)}`),
      createPrompt: (body: Record<string, unknown>) => post<{ template: unknown }>("/admin/ai-control/prompts", body),
      updatePrompt: (id: string, body: Record<string, unknown>) =>
        patch<{ template: unknown }>(`/admin/ai-control/prompts/${id}`, body),
      importPrompts: (body: { templates: unknown[] }) => post<{ imported: number }>("/admin/ai-control/prompts/import", body),
      exportPromptsUrl: (tenantId?: string) =>
        `/api/admin/ai-control/prompts/import${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`,
      deleteEmbedding: (id: string) => del<{ success: boolean }>(`/admin/ai-control/embeddings?id=${encodeURIComponent(id)}`),
      reindexDocument: (documentId: string) =>
        post<{ success?: boolean }>(`/admin/ai-control/embeddings?documentId=${encodeURIComponent(documentId)}`, {}),
      marketplaceAction: (body: { action: "install" | "uninstall"; marketplaceId: string; tenantId: string }) =>
        post<{ install: unknown }>("/admin/ai-control/marketplace", body),
      audit: (tenantId?: string) =>
        get<{ items: unknown[] }>(`/admin/ai-control/audit${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`),
    },
  },
  kitchen: kitchenApi,
  menu: menuApi,
  orders: ordersApi,
  rooms: roomsApi,
  tables: tablesApi,
  warehouse: warehouseApi,
  staff: staffApi,
  customers: customersApi,
  bookings: bookingsApi,
  suppliers: suppliersApi,
  purchaseOrders: purchaseOrdersApi,
  catering: cateringApi,
  asporto: asportoApi,
  archivio: archivioApi,
  archivioFiscalStubs: archivioFiscalStubsApi,
  supervisorStorni: supervisorStorniApi,
  warehouseVoice: warehouseVoiceApi,
  haccp: haccpApi,
  sessions: sessionsApi,
  hardware: hardwareApi,
  hotel: hotelApi,
  integration: integrationApi,
  reports: reportsApi,
  aiOps: aiOpsApi,
  aiCommandCenter: aiCommandCenterApi,
  aiMemory: aiMemoryApi,
  ai: aiApi,
  billing: billingApi,
};

/* ─── Types re-exported for frontend convenience ─── */

export type RecipeIngredient = { id: string; name: string; qty: number; unit: string; unitCost: number; wastePct: number };
export type RecipeStep = { id: string; order: number; text: string };
export type Recipe = {
  id: string; name: string; category: string; area: "cucina" | "pizzeria" | "bar";
  portions: number; sellingPrice: number; targetFcPct: number; ivaPct: number; overheadPct: number;
  packagingCost: number; laborCost: number; energyCost: number;
  ingredients: RecipeIngredient[]; steps: RecipeStep[]; notes: string; createdAt: string;
};
export type FoodCostResult = { ingredientCost: number; productionCost: number; portionCost: number; withOverhead: number; fcPct: number; margin: number; suggestedPrice: number };
export type MenuItem = { id: string; name: string; category: string; area: string; price: number; code: string; active: boolean; recipeId: string | null; notes: string; foodCostPct: number | null };
export type DailyDish = { id: string; name: string; description: string; category: string; price: number; allergens: string; recipeId: string | null };
export type CourseStatus = "queued" | "in_attesa" | "in_preparazione" | "pronto" | "servito";
export type OrderStatus =
  | "pending"
  | "in_attesa"
  | "in_preparazione"
  | "pronto"
  | "servito"
  | "chiuso"
  | "annullato"
  | "conto_richiesto";
export type OrderOnlinePaymentStatus = "unpaid" | "paid";
export type OrderArea = "sala" | "cucina" | "bar" | "pizzeria";
export type OrderItem = {
  id: string;
  menuItemId?: string | null;
  name: string;
  qty: number;
  category: string | null;
  area: OrderArea;
  price: number | null;
  note: string | null;
  course: number;
};
export type Order = {
  id: string;
  table: string | null;
  covers: number | null;
  area: OrderArea;
  waiter: string;
  notes: string;
  items: OrderItem[];
  activeCourse: number;
  courseStates: Record<string, CourseStatus>;
  status: OrderStatus;
  onlinePaymentStatus: OrderOnlinePaymentStatus;
  stripeCheckoutSessionId: string | null;
  createdAt: string;
  updatedAt: string;
};
export type TableStatus = "libero" | "aperto" | "conto" | "sporco";
export type SalaTable = { id: string; nome: string; posti: number; x: number; y: number; forma: "tondo" | "quadrato"; stato: TableStatus; roomId: string };
export type Room = { id: string; name: string; tables: number };
export type StockItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  supplier: string;
  lotNumber?: string | null;
  expiryDate?: string | null;
  /** Scorte nei reparti (escluso il centrale). Presente nella risposta di listItemsWithLocations. */
  locationStocks?: { location: string; qty: number }[];
  /** Totale centrale + reparti. */
  totalQty?: number;
};
export type StockMovement = {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: "carico" | "scarico" | "scarico_comanda" | "trasferimento" | "rettifica";
  qty: number;
  unit: string;
  reason: string;
  fromLocation?: string | null;
  toLocation?: string | null;
  note?: string | null;
  orderId?: string;
};
export type WarehouseAlert = { id: string; name: string; qty: number; minStock: number; level: "warning" | "critical"; message: string };
export type WarehouseEquipment = {
  id: string;
  name: string;
  category: string;
  qty: number;
  status: "operativo" | "manutenzione" | "fuori uso";
  location: string;
  value: number;
};
export type StaffMember = { id: string; userId?: string | null; name: string; role: string; email: string; phone: string; hireDate: string; salary: number; status: "attivo" | "ferie" | "malattia" | "licenziato"; hoursWeek: number; notes: string };
export type StaffShift = { id: string; staffId: string; clockInAt: string; clockOutAt: string | null; notes: string; durationHours: number | null };
export type Customer = { id: string; name: string; email: string; phone: string; type: "vip" | "habitue" | "walk-in" | "new"; visits: number; totalSpent: number; avgSpend: number; allergies: string; preferences: string; notes: string; lastVisit: string };
export type Booking = { id: string; customerName: string; phone: string; email: string; date: string; time: string; guests: number; table: string; notes: string; status: "confermata" | "in_attesa" | "annullata" | "completata"; allergies: string };
export type Supplier = { id: string; name: string; category: string; email: string; phone: string; address: string; piva: string; paymentTerms: string; rating: number; notes: string; active: boolean };
export type CateringEvent = { id: string; name: string; date: string; guests: number; venue: string; budget: number; status: "preventivo" | "confermato" | "completato" | "annullato"; contact: string; phone: string; menu: string; notes: string; depositPaid: boolean };
export type AsportoOrder = { id: string; customerName: string; phone: string; items: { name: string; qty: number; price: number }[]; total: number; status: "nuovo" | "in_preparazione" | "pronto" | "ritirato" | "consegnato" | "annullato"; pickupTime: string; notes: string; createdAt: string; type: "asporto" | "delivery"; address: string };
export type ArchivedOrder = { id: string; date: string; table: string; waiter: string; items: { name: string; qty: number; price: number }[]; total: number; status: "completato" | "annullato" | "stornato"; paymentMethod: "contanti" | "carta" | "misto"; closedAt: string };
