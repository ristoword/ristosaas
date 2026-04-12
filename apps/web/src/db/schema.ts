export type EntityId = string;

export type Tenant = {
  id: EntityId;
  name: string;
  slug: string;
  plan: "restaurant_only" | "hotel_only" | "all_included";
  createdAt: string;
  updatedAt: string;
};

export type TenantFeature = {
  id: EntityId;
  tenantId: EntityId;
  code: "restaurant" | "hotel" | "integration_room_charge" | "integration_unified_folio" | "integration_meal_plans";
  enabled: boolean;
};

export type User = {
  id: EntityId;
  tenantId: EntityId;
  username: string;
  passwordHash: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type Recipe = {
  id: EntityId;
  name: string;
  category: string;
  area: "cucina" | "pizzeria" | "bar";
  portions: number;
  sellingPrice: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type RecipeIngredient = {
  id: EntityId;
  recipeId: EntityId;
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
  wastePct: number;
};

export type RecipeStep = {
  id: EntityId;
  recipeId: EntityId;
  stepOrder: number;
  text: string;
};

export type MenuCategory = {
  id: EntityId;
  name: string;
  area: string;
  active: boolean;
};

export type MenuItem = {
  id: EntityId;
  categoryId: EntityId;
  recipeId: EntityId | null;
  name: string;
  code: string;
  price: number;
  foodCostPct: number | null;
  active: boolean;
  notes: string;
};

export type Room = {
  id: EntityId;
  name: string;
  tables: number;
};

export type Table = {
  id: EntityId;
  roomId: EntityId;
  name: string;
  seats: number;
  shape: "tondo" | "quadrato";
  status: "libero" | "aperto" | "conto" | "sporco";
  x: number;
  y: number;
};

export type Order = {
  id: EntityId;
  tableId: EntityId | null;
  customerId: EntityId | null;
  waiterUserId: EntityId | null;
  status: "in_attesa" | "in_preparazione" | "pronto" | "servito" | "chiuso" | "annullato";
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: EntityId;
  orderId: EntityId;
  menuItemId: EntityId | null;
  name: string;
  qty: number;
  price: number | null;
  area: "sala" | "cucina" | "bar" | "pizzeria";
  course: number;
  note: string | null;
};

export type Customer = {
  id: EntityId;
  tenantId: EntityId;
  name: string;
  email: string;
  phone: string;
  allergies: string;
  preferences: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Reservation = {
  id: EntityId;
  customerId: EntityId | null;
  tableId: EntityId | null;
  date: string;
  time: string;
  guests: number;
  status: "confermata" | "in_attesa" | "annullata" | "completata";
  notes: string;
};

export type WarehouseItem = {
  id: EntityId;
  tenantId: EntityId;
  name: string;
  category: string;
  qty: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  supplier: string;
};

export type HotelRoom = {
  id: EntityId;
  tenantId: EntityId;
  siteId: EntityId | null;
  code: string;
  floor: number;
  roomType: string;
  capacity: number;
  status: "available" | "occupied" | "dirty" | "maintenance" | "out_of_service";
};

export type HotelReservation = {
  id: EntityId;
  tenantId: EntityId;
  customerId: EntityId;
  roomId: EntityId | null;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  boardType: "room_only" | "bed_breakfast" | "half_board" | "full_board";
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
};

export type Stay = {
  id: EntityId;
  tenantId: EntityId;
  reservationId: EntityId;
  folioId: EntityId | null;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
};

export type HousekeepingTask = {
  id: EntityId;
  tenantId: EntityId;
  roomId: EntityId;
  assignedToUserId: EntityId | null;
  status: "todo" | "in_progress" | "done";
  scheduledFor: string;
};

export type GuestFolio = {
  id: EntityId;
  tenantId: EntityId;
  customerId: EntityId;
  stayId: EntityId | null;
  balance: number;
  currency: string;
};

export type FolioCharge = {
  id: EntityId;
  folioId: EntityId;
  source: "hotel" | "restaurant" | "manual";
  sourceId: EntityId | null;
  description: string;
  amount: number;
  postedAt: string;
};

export type Schema = {
  tenants: Tenant[];
  tenantFeatures: TenantFeature[];
  users: User[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  recipeSteps: RecipeStep[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  rooms: Room[];
  tables: Table[];
  orders: Order[];
  orderItems: OrderItem[];
  customers: Customer[];
  reservations: Reservation[];
  warehouseItems: WarehouseItem[];
  hotelRooms: HotelRoom[];
  hotelReservations: HotelReservation[];
  stays: Stay[];
  housekeepingTasks: HousekeepingTask[];
  guestFolios: GuestFolio[];
  folioCharges: FolioCharge[];
};
