/**
 * Thin API client — wraps fetch with JSON handling.
 * All frontend contexts call this instead of managing state locally.
 */

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
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

type AuthUser = { id: string; username: string; name: string; role: string; email: string };

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
  list: () => get<{ items: StockItem[]; lowStock: StockItem[]; totalValue: number }>("/warehouse/stock"),
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

export const api = {
  auth: {
    me: () => get<AuthUser>("/auth/me"),
    login: (username: string, password: string) => post<{ user: AuthUser }>("/auth/login", { username, password }),
    logout: () => post<{ ok: boolean }>("/auth/logout", {}),
    changePassword: (currentPassword: string, newPassword: string) =>
      post<{ success: boolean }>("/auth/change-password", { currentPassword, newPassword }),
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
export type StaffMember = { id: string; name: string; role: string; email: string; phone: string; hireDate: string; salary: number; status: "attivo" | "ferie" | "malattia" | "licenziato"; hoursWeek: number; notes: string };
export type Customer = { id: string; name: string; email: string; phone: string; type: "vip" | "habitue" | "walk-in" | "new"; visits: number; totalSpent: number; avgSpend: number; allergies: string; preferences: string; notes: string; lastVisit: string };
export type Booking = { id: string; customerName: string; phone: string; email: string; date: string; time: string; guests: number; table: string; notes: string; status: "confermata" | "in_attesa" | "annullata" | "completata"; allergies: string };
export type Supplier = { id: string; name: string; category: string; email: string; phone: string; address: string; piva: string; paymentTerms: string; rating: number; notes: string; active: boolean };
export type CateringEvent = { id: string; name: string; date: string; guests: number; venue: string; budget: number; status: "preventivo" | "confermato" | "completato" | "annullato"; contact: string; phone: string; menu: string; notes: string; depositPaid: boolean };
export type AsportoOrder = { id: string; customerName: string; phone: string; items: { name: string; qty: number; price: number }[]; total: number; status: "nuovo" | "in_preparazione" | "pronto" | "ritirato" | "consegnato" | "annullato"; pickupTime: string; notes: string; createdAt: string; type: "asporto" | "delivery"; address: string };
export type ArchivedOrder = { id: string; date: string; table: string; waiter: string; items: { name: string; qty: number; price: number }[]; total: number; status: "completato" | "annullato" | "stornato"; paymentMethod: "contanti" | "carta" | "misto"; closedAt: string };
