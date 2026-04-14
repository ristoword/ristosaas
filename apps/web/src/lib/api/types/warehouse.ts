export type StockItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  supplier: string;
};

export type StockMovement = {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: "carico" | "scarico" | "scarico_comanda";
  qty: number;
  unit: string;
  reason: string;
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
