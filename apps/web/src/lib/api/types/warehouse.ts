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
};

export type WarehouseLocation =
  | "MAGAZZINO_CENTRALE"
  | "CUCINA"
  | "PIZZERIA"
  | "BAR"
  | "CANTINA"
  | "SALA"
  | "PROPRIETA"
  | "ALTRO";

export const WAREHOUSE_LOCATIONS: WarehouseLocation[] = [
  "MAGAZZINO_CENTRALE",
  "CUCINA",
  "PIZZERIA",
  "BAR",
  "CANTINA",
  "SALA",
  "PROPRIETA",
  "ALTRO",
];

/** Reparti operativi (tutte le location tranne il magazzino centrale). */
export const WAREHOUSE_DEPARTMENTS: WarehouseLocation[] = WAREHOUSE_LOCATIONS.filter(
  (l) => l !== "MAGAZZINO_CENTRALE",
);

export const WAREHOUSE_LOCATION_LABELS: Record<WarehouseLocation, string> = {
  MAGAZZINO_CENTRALE: "Magazzino Centrale",
  CUCINA: "Cucina",
  PIZZERIA: "Pizzeria",
  BAR: "Bar",
  CANTINA: "Cantina",
  SALA: "Sala",
  PROPRIETA: "Proprietà",
  ALTRO: "Altro",
};

export type LocationStock = {
  location: WarehouseLocation;
  qty: number;
};

export type StockItemWithLocations = StockItem & {
  locationStocks: LocationStock[];
  totalQty: number;
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

export type WarehouseEquipment = {
  id: string;
  name: string;
  category: string;
  qty: number;
  status: "operativo" | "manutenzione" | "fuori uso";
  location: string;
  value: number;
};
