"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { warehouseApi, type StockItem, type StockMovement } from "@/lib/api-client";

export type { StockItem, StockMovement };

export type DishCostReport = {
  dishName: string;
  totalCost: number;
  ingredients: { name: string; qty: number; unit: string; cost: number }[];
};

type WarehouseContextValue = {
  stock: StockItem[];
  movements: StockMovement[];
  dischargeLogs: DishCostReport[];
  loading: boolean;
  addStock: (item: Omit<StockItem, "id">) => Promise<void>;
  loadStock: (productId: string, qty: number, reason?: string) => Promise<void>;
  dischargeForOrder: (orderId: string, items: { name: string; qty: number; ingredients: { name: string; qty: number; unit: string; costPerUnit: number }[] }[]) => DishCostReport[];
  manualDischarge: (productName: string, qty: number, reason: string) => Promise<void>;
  getStockByName: (name: string) => StockItem | undefined;
  lowStockItems: () => StockItem[];
  totalStockValue: () => number;
  refresh: () => Promise<void>;
};

const Ctx = createContext<WarehouseContextValue | null>(null);

export function useWarehouse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWarehouse must be inside WarehouseProvider");
  return ctx;
}

export function WarehouseProvider({ children }: { children: React.ReactNode }) {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [dischargeLogs, setDischargeLogs] = useState<DishCostReport[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [stockData, movData] = await Promise.all([warehouseApi.list(), warehouseApi.movements()]);
      setStock(stockData.items);
      setMovements(movData);
    } catch (e) {
      console.error("WarehouseProvider refresh:", e instanceof Error ? e.message : e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    // Polling ogni 30 secondi per tenere aggiornate le scorte in background.
    const interval = setInterval(() => void refresh(), 30_000);

    // Ascolta l'evento custom emesso quando un ordine viene servito/chiuso.
    const handleOrderServed = () => void refresh();
    window.addEventListener("warehouse:refresh", handleOrderServed);

    return () => {
      clearInterval(interval);
      window.removeEventListener("warehouse:refresh", handleOrderServed);
    };
  }, [refresh]);

  const addStock = useCallback(async (item: Omit<StockItem, "id">) => {
    const created = await warehouseApi.create(item);
    setStock((p) => [...p, created]);
  }, []);

  const loadStock = useCallback(async (productId: string, qty: number, reason = "Carico manuale") => {
    const { item } = await warehouseApi.load(productId, qty, reason);
    setStock((p) => p.map((s) => (s.id === item.id ? item : s)));
    const mvs = await warehouseApi.movements();
    setMovements(mvs);
  }, []);

  const dischargeForOrder = useCallback((orderId: string, items: { name: string; qty: number; ingredients: { name: string; qty: number; unit: string; costPerUnit: number }[] }[]): DishCostReport[] => {
    const reports: DishCostReport[] = [];
    for (const dish of items) {
      const report: DishCostReport = { dishName: dish.name, totalCost: 0, ingredients: [] };
      for (const ing of dish.ingredients) {
        const totalQty = ing.qty * dish.qty;
        const cost = totalQty * ing.costPerUnit;
        report.ingredients.push({ name: ing.name, qty: totalQty, unit: ing.unit, cost });
        report.totalCost += cost;
      }
      reports.push(report);
    }
    setDischargeLogs((p) => [...p, ...reports]);
    refresh();
    return reports;
  }, [refresh]);

  const manualDischarge = useCallback(async (productName: string, qty: number, reason: string) => {
    await warehouseApi.discharge(productName, qty, reason);
    await refresh();
  }, [refresh]);

  const getStockByName = useCallback((name: string) => {
    return stock.find((s) => s.name.toLowerCase() === name.toLowerCase());
  }, [stock]);

  const lowStockItems = useCallback(() => stock.filter((s) => (s.totalQty ?? s.qty) <= s.minStock), [stock]);

  const totalStockValue = useCallback(() => stock.reduce((s, i) => s + (i.totalQty ?? i.qty) * i.costPerUnit, 0), [stock]);

  return (
    <Ctx.Provider value={{ stock, movements, dischargeLogs, loading, addStock, loadStock, dischargeForOrder, manualDischarge, getStockByName, lowStockItems, totalStockValue, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
