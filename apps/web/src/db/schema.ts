export type EntityId = string;

export type User = {
  id: EntityId;
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
  name: string;
  category: string;
  qty: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  supplier: string;
};

export type Schema = {
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
};
