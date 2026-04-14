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
export type GuestFolio = { id: string; tenantId: string; customerId: string; stayId: string | null; currency: string; balance: number; status: "open" | "closed" };
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

export const billingApi = {
  overview: () =>
    get<{
      subscription: BillingSubscription | null;
      events: BillingEvent[];
    }>("/billing/overview"),
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
    tenants: {
      list: () => get<AdminTenant[]>("/admin/tenants"),
    },
    licenses: {
      list: () => get<AdminLicense[]>("/admin/licenses"),
      setStatus: (id: string, status: AdminLicense["status"]) => patch<AdminLicense>(`/admin/licenses/${id}`, { status }),
    },
    emailConfig: {
      list: () => get<AdminEmailConfig[]>("/admin/email-config"),
      save: (tenantId: string, payload: { host: string; port: number; username: string; password: string; fromAddress: string; secure: boolean }) =>
        put<AdminEmailConfig>(`/admin/email-config/${tenantId}`, payload),
      test: (tenantId: string) => post<AdminEmailConfig>(`/admin/email-config/${tenantId}/test`, {}),
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
  catering: cateringApi,
  asporto: asportoApi,
  archivio: archivioApi,
  hotel: hotelApi,
  integration: integrationApi,
  reports: reportsApi,
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
export type StaffMember = { id: string; name: string; role: string; email: string; phone: string; hireDate: string; salary: number; status: "attivo" | "ferie" | "malattia" | "licenziato"; hoursWeek: number; notes: string };
export type StaffShift = { id: string; staffId: string; clockInAt: string; clockOutAt: string | null; notes: string; durationHours: number | null };
export type Customer = { id: string; name: string; email: string; phone: string; type: "vip" | "habitue" | "walk-in" | "new"; visits: number; totalSpent: number; avgSpend: number; allergies: string; preferences: string; notes: string; lastVisit: string };
export type Booking = { id: string; customerName: string; phone: string; email: string; date: string; time: string; guests: number; table: string; notes: string; status: "confermata" | "in_attesa" | "annullata" | "completata"; allergies: string };
export type Supplier = { id: string; name: string; category: string; email: string; phone: string; address: string; piva: string; paymentTerms: string; rating: number; notes: string; active: boolean };
export type CateringEvent = { id: string; name: string; date: string; guests: number; venue: string; budget: number; status: "preventivo" | "confermato" | "completato" | "annullato"; contact: string; phone: string; menu: string; notes: string; depositPaid: boolean };
export type AsportoOrder = { id: string; customerName: string; phone: string; items: { name: string; qty: number; price: number }[]; total: number; status: "nuovo" | "in_preparazione" | "pronto" | "ritirato" | "consegnato" | "annullato"; pickupTime: string; notes: string; createdAt: string; type: "asporto" | "delivery"; address: string };
export type ArchivedOrder = { id: string; date: string; table: string; waiter: string; items: { name: string; qty: number; price: number }[]; total: number; status: "completato" | "annullato" | "stornato"; paymentMethod: "contanti" | "carta" | "misto"; closedAt: string };
