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
  create: (data: Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status">) => post<Order>("/orders", data),
  update: (id: string, data: Partial<Order>) => put<Order>(`/orders/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/orders/${id}`),
  patchStatus: (id: string, status: string) => patch<{ order: Order; discharge: unknown }>(`/orders/${id}/status`, { status }),
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

export const purchaseOrdersApi = {
  list: (status?: PurchaseOrderStatus) =>
    get<PurchaseOrder[]>(status ? `/purchase-orders?status=${status}` : "/purchase-orders"),
  get: (id: string) => get<PurchaseOrder>(`/purchase-orders/${id}`),
  setStatus: (id: string, status: "bozza" | "inviato" | "annullato") =>
    patch<PurchaseOrder>(`/purchase-orders/${id}`, { status }),
  receive: (id: string, receipts: Array<{ itemId: string; qty: number }>) =>
    post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { receipts }),
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

export const asportoApi = {
  list: () => get<AsportoOrder[]>("/asporto"),
  get: (id: string) => get<AsportoOrder>(`/asporto/${id}`),
  create: (data: Omit<AsportoOrder, "id">) => post<AsportoOrder>("/asporto", data),
  update: (id: string, data: Partial<AsportoOrder>) => put<AsportoOrder>(`/asporto/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/asporto/${id}`),
};

/* ─── Archivio ───────────────────────────────────── */

export const archivioApi = {
  list: () => get<ArchivedOrder[]>("/archivio"),
  get: (id: string) => get<ArchivedOrder>(`/archivio/${id}`),
  create: (data: Omit<ArchivedOrder, "id">) => post<ArchivedOrder>("/archivio", data),
  update: (id: string, data: Partial<ArchivedOrder>) => put<ArchivedOrder>(`/archivio/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/archivio/${id}`),
};

/* ─── HACCP ───────────────────────────────────────── */

export type HaccpEntryType =
  | "temp_frigo"
  | "temp_freezer"
  | "temp_cottura"
  | "temp_abbattitore"
  | "sanificazione"
  | "ricezione_merce"
  | "altro";

export type HaccpEntry = {
  id: string;
  tenantId: string;
  type: HaccpEntryType;
  recordedAt: string;
  location: string;
  tempC: number | null;
  operator: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
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
  create: (data: {
    type?: HaccpEntryType;
    recordedAt?: string;
    location?: string;
    tempC?: number | null;
    operator?: string;
    notes?: string;
  }) => post<HaccpEntry>("/haccp", data),
  update: (id: string, data: Partial<{
    type: HaccpEntryType;
    recordedAt: string;
    location: string;
    tempC: number | null;
    operator: string;
    notes: string;
  }>) => put<HaccpEntry>(`/haccp/${id}`, data),
  delete: (id: string) => del<{ deleted: boolean }>(`/haccp/${id}`),
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
  }) => post<{ reply: string }>("/ai/chat", payload),
  history: (context?: string) => {
    const qs = context ? `?context=${encodeURIComponent(context)}` : "";
    return get<AiChatLog[]>(`/ai/history${qs}`);
  },
};

export type HotelRoomStatus = "libera" | "occupata" | "da_pulire" | "pulita" | "fuori_servizio" | "manutenzione";
export type HotelReservationStatus = "confermata" | "in_casa" | "check_out" | "cancellata" | "no_show";
export type HotelRoom = { id: string; code: string; floor: number; capacity: number; status: HotelRoomStatus; roomType: string; ratePlanCode?: string };
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
};
export type HotelStay = { id: string; reservationId: string; roomId: string; actualCheckInAt: string | null; actualCheckOutAt: string | null };
export type HousekeepingTask = { id: string; roomId: string; assignedTo: string; status: "todo" | "in_progress" | "done"; scheduledFor: string; inspected: boolean };
export type HotelKeycard = { id: string; roomId: string; reservationId: string; validFrom: string; validUntil: string; status: "attiva" | "scaduta" | "annullata"; issuedBy: string };
export type GuestFolio = { id: string; tenantId: string; customerId: string; stayId: string | null; currency: string; balance: number; status: "open" | "closed"; guestName?: string | null; roomCode?: string | null; reservationId?: string | null };
export type FolioCharge = { id: string; folioId: string; source: "hotel" | "restaurant" | "manual" | "city_tax" | "payment" | "meal_plan_credit"; sourceId: string | null; description: string; amount: number; postedAt: string };
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
  checkOut: (reservationId: string, cityTaxAmount = 0, paymentMethod: "cash" | "card" | "room_charge_settlement" = "card") =>
    post<{
      reservation: HotelReservation;
      room: HotelRoom;
      stay: HotelStay | null;
      housekeepingTask: HousekeepingTask;
      keycards: HotelKeycard[];
      folio: { folio: GuestFolio; charges: FolioCharge[]; settlement: FolioCharge } | null;
    }>("/hotel/front-desk/check-out", { reservationId, cityTaxAmount, paymentMethod }),
  listHousekeeping: () => get<HousekeepingTask[]>("/hotel/housekeeping"),
  listKeycards: () => get<HotelKeycard[]>("/hotel/keycards"),
  listRatePlans: (roomType?: string) =>
    get<RatePlan[]>(roomType ? `/hotel/rate-plans?roomType=${encodeURIComponent(roomType)}` : "/hotel/rate-plans"),
};

export const integrationApi = {
  listFolios: () => get<GuestFolio[]>("/integration/folios"),
  listCharges: () => get<FolioCharge[]>("/integration/charges"),
  chargeRoom: (reservationId: string, orderId: string, description: string, amount: number, serviceType: "breakfast" | "lunch" | "dinner") =>
    post<{ folio: GuestFolio; charge: FolioCharge; credits: FolioCharge[] }>("/integration/room-charge", { reservationId, orderId, description, amount, serviceType }),
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

export const aiOpsApi = {
  kitchenOperationalInsights: (days = 14) =>
    get<KitchenOperationalSnapshot>(`/ai/kitchen/insights?mode=operational&days=${days}`),
  proposals: {
    list: (params?: { status?: AiProposalStatus; type?: AiProposalType; limit?: number; open?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.type) qs.set("type", params.type);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.open) qs.set("open", "true");
      return get<{ proposals: AiProposal[] }>(`/ai/proposals${qs.toString() ? `?${qs.toString()}` : ""}`);
    },
    generate: (payload?: { days?: number; status?: "draft" | "pending_review" }) =>
      post<{ snapshot: KitchenOperationalSnapshot; proposals: AiProposal[]; generated: number }>(
        "/ai/proposals/generate",
        payload || {},
      ),
    review: (id: string, payload: { action: "approve" | "reject" | "cancel"; notes?: string }) =>
      patch<{ proposal: AiProposal }>(`/ai/proposals/${id}/review`, payload),
    apply: (id: string, payload?: { notes?: string }) =>
      post<{ proposal: AiProposal | null }>(`/ai/proposals/${id}/apply`, payload || {}),
  },
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
  haccp: haccpApi,
  sessions: sessionsApi,
  hardware: hardwareApi,
  hotel: hotelApi,
  integration: integrationApi,
  reports: reportsApi,
  aiOps: aiOpsApi,
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
export type OrderStatus = "in_attesa" | "in_preparazione" | "pronto" | "servito" | "chiuso" | "annullato";
export type OrderArea = "sala" | "cucina" | "bar" | "pizzeria";
export type OrderItem = { id: string; name: string; qty: number; category: string | null; area: OrderArea; price: number | null; note: string | null; course: number };
export type Order = { id: string; table: string | null; covers: number | null; area: OrderArea; waiter: string; notes: string; items: OrderItem[]; activeCourse: number; courseStates: Record<string, CourseStatus>; status: OrderStatus; createdAt: string; updatedAt: string };
export type TableStatus = "libero" | "aperto" | "conto" | "sporco";
export type SalaTable = { id: string; nome: string; posti: number; x: number; y: number; forma: "tondo" | "quadrato"; stato: TableStatus; roomId: string };
export type Room = { id: string; name: string; tables: number };
export type StockItem = { id: string; name: string; category: string; qty: number; unit: string; minStock: number; costPerUnit: number; supplier: string };
export type StockMovement = { id: string; date: string; productId: string; productName: string; type: "carico" | "scarico" | "scarico_comanda"; qty: number; unit: string; reason: string; orderId?: string };
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
export type StaffMember = { id: string; name: string; role: string; email: string; phone: string; hireDate: string; salary: number; status: "attivo" | "ferie" | "malattia" | "licenziato"; hoursWeek: number; notes: string };
export type StaffShift = { id: string; staffId: string; clockInAt: string; clockOutAt: string | null; notes: string; durationHours: number | null };
export type Customer = { id: string; name: string; email: string; phone: string; type: "vip" | "habitue" | "walk-in" | "new"; visits: number; totalSpent: number; avgSpend: number; allergies: string; preferences: string; notes: string; lastVisit: string };
export type Booking = { id: string; customerName: string; phone: string; email: string; date: string; time: string; guests: number; table: string; notes: string; status: "confermata" | "in_attesa" | "annullata" | "completata"; allergies: string };
export type Supplier = { id: string; name: string; category: string; email: string; phone: string; address: string; piva: string; paymentTerms: string; rating: number; notes: string; active: boolean };
export type CateringEvent = { id: string; name: string; date: string; guests: number; venue: string; budget: number; status: "preventivo" | "confermato" | "completato" | "annullato"; contact: string; phone: string; menu: string; notes: string; depositPaid: boolean };
export type AsportoOrder = { id: string; customerName: string; phone: string; items: { name: string; qty: number; price: number }[]; total: number; status: "nuovo" | "in_preparazione" | "pronto" | "ritirato" | "consegnato" | "annullato"; pickupTime: string; notes: string; createdAt: string; type: "asporto" | "delivery"; address: string };
export type ArchivedOrder = { id: string; date: string; table: string; waiter: string; items: { name: string; qty: number; price: number }[]; total: number; status: "completato" | "annullato" | "stornato"; paymentMethod: "contanti" | "carta" | "misto"; closedAt: string };
