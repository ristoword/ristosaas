import type { StockItem, StockMovement } from "@/lib/api/types/warehouse";

const stock = new Map<string, StockItem>();
const stockMovements: StockMovement[] = [];

const SEED_STOCK: StockItem[] = [
  { id: "ws_1", name: "Farina 00", category: "Secchi", qty: 120, unit: "kg", minStock: 50, costPerUnit: 0.85, supplier: "Molino Rossi" },
  { id: "ws_2", name: "Mozzarella di bufala", category: "Latticini", qty: 15, unit: "kg", minStock: 10, costPerUnit: 12.5, supplier: "Caseificio Ferrara" },
  { id: "ws_3", name: "Pomodoro San Marzano", category: "Conserve", qty: 80, unit: "kg", minStock: 30, costPerUnit: 2.8, supplier: "Ortofrutticola Sud" },
  { id: "ws_4", name: "Olio EVO Puglia", category: "Condimenti", qty: 45, unit: "L", minStock: 20, costPerUnit: 8.9, supplier: "Oleificio Ferrante" },
  { id: "ws_5", name: "Vino Montepulciano", category: "Bevande", qty: 36, unit: "bt", minStock: 12, costPerUnit: 4.5, supplier: "Cantina dei Colli" },
  { id: "ws_6", name: "Lievito di birra", category: "Secchi", qty: 8, unit: "kg", minStock: 5, costPerUnit: 3.2, supplier: "Molino Rossi" },
  { id: "ws_7", name: "Basilico fresco", category: "Ortofrutta", qty: 4, unit: "kg", minStock: 2, costPerUnit: 6.0, supplier: "Ortofrutticola Sud" },
  { id: "ws_8", name: "Guanciale", category: "Salumi", qty: 12, unit: "kg", minStock: 5, costPerUnit: 14.0, supplier: "Salumificio Norcia" },
  { id: "ws_9", name: "Pecorino Romano", category: "Latticini", qty: 8, unit: "kg", minStock: 3, costPerUnit: 18.0, supplier: "Caseificio Ferrara" },
  { id: "ws_10", name: "Uova fresche", category: "Freschi", qty: 120, unit: "pz", minStock: 48, costPerUnit: 0.25, supplier: "Fattoria Verde" },
  { id: "ws_11", name: "Parmigiano Reggiano", category: "Latticini", qty: 6, unit: "kg", minStock: 3, costPerUnit: 22.0, supplier: "Caseificio Ferrara" },
  { id: "ws_12", name: "Pasta spaghetti", category: "Secchi", qty: 40, unit: "kg", minStock: 15, costPerUnit: 1.8, supplier: "Pastificio Rummo" },
];

for (const item of SEED_STOCK) stock.set(item.id, item);

export const stockStore = {
  all: () => [...stock.values()],
  get: (id: string) => stock.get(id),
  set: (id: string, item: StockItem) => stock.set(id, item),
  delete: (id: string) => stock.delete(id),
  findByName: (name: string) => [...stock.values()].find((item) => item.name.toLowerCase() === name.toLowerCase()),
};

export const stockMovementsStore = {
  all: () => [...stockMovements],
  push: (...movements: StockMovement[]) => stockMovements.push(...movements),
};
