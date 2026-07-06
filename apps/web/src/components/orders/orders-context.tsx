"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ordersApi, type Order, type OrderStatus } from "@/lib/api-client";
import { useOrderSocket } from "@/lib/realtime/use-socket";
import { useAuth } from "@/components/auth/auth-context";

export type StockAlert = {
  itemId: string;
  itemName: string;
  qty: number;
  minStock: number;
  level: "warning" | "critical";
};

type OrdersContextValue = {
  orders: Order[];
  activeOrders: Order[];
  loading: boolean;
  loadError: string | null;
  stockAlerts: StockAlert[];
  clearStockAlerts: () => void;
  createOrder: (
    o: Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status" | "onlinePaymentStatus" | "stripeCheckoutSessionId">,
  ) => Promise<void>;
  appendToOrder: (orderId: string, items: Order["items"], notes?: string) => Promise<void>;
  patchStatus: (id: string, status: OrderStatus, course?: number) => Promise<void>;
  patchActiveCourse: (id: string, course: number) => Promise<void>;
  getOrdersForArea: (area: string) => Order[];
  getOrdersForTable: (table: string) => Order[];
  refresh: () => Promise<void>;
};

const Ctx = createContext<OrdersContextValue | null>(null);

export function useOrders() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrders must be inside OrdersProvider");
  return ctx;
}

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.list();
      setOrders(data);
      setLoadError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore caricamento ordini";
      console.error("OrdersProvider refresh:", msg);
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertOrder = useCallback((order: Order) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = order;
        return copy;
      }
      return [order, ...prev];
    });
  }, []);

  const { connected: socketConnected } = useOrderSocket(tenantId, {
    onOrderCreated: (p) => upsertOrder(p.order),
    onOrderUpdated: (p) => upsertOrder(p.order),
    onOrderAppended: (p) => upsertOrder(p.order),
    onOrderStatusChanged: (p) => upsertOrder(p.order),
    onOrderDeleted: (p) => setOrders((prev) => prev.filter((o) => o.id !== p.orderId)),
  });

  useEffect(() => {
    void refresh();
    // When WebSocket is connected, reduce polling to 60s (safety net).
    // When disconnected, poll every 5s for faster feedback.
    const interval = socketConnected ? 60_000 : 5_000;
    const timer = setInterval(() => void refresh(), interval);
    return () => clearInterval(timer);
  }, [refresh, socketConnected]);

  const clearStockAlerts = useCallback(() => setStockAlerts([]), []);

  function pushStockAlerts(alerts: StockAlert[]) {
    if (!alerts.length) return;
    setStockAlerts(alerts);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    // Auto-clear dopo 15 secondi
    alertTimerRef.current = setTimeout(() => setStockAlerts([]), 15_000);
  }

  const activeOrders = orders.filter(
    (o) => !["chiuso", "annullato", "servito"].includes(o.status),
  );

  const createOrder = useCallback(async (
    payload: Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status" | "onlinePaymentStatus" | "stripeCheckoutSessionId">,
  ) => {
    const order = await ordersApi.create(payload);
    setOrders((prev) => [order, ...prev]);
  }, []);

  const appendToOrder = useCallback(async (orderId: string, items: Order["items"], notes?: string) => {
    const updated = await ordersApi.appendItems(orderId, items, notes);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
  }, []);

  const patchStatus = useCallback(async (id: string, status: OrderStatus, course?: number) => {
    const result = await ordersApi.patchStatus(id, status, course);
    const { order } = result;
    setOrders((prev) => prev.map((o) => (o.id === id ? order : o)));

    // Estrae alert scarico magazzino e li espone per le schermate KDS
    const discharge = (result as { order: Order; discharge?: { alerts?: StockAlert[] } }).discharge;
    if (discharge?.alerts?.length) {
      pushStockAlerts(discharge.alerts);
    }

    // Notifica il WarehouseProvider che le scorte potrebbero essere cambiate
    if (status === "servito" || status === "chiuso" || status === "annullato") {
      window.dispatchEvent(new CustomEvent("warehouse:refresh"));
    }
  }, []);

  const patchActiveCourse = useCallback(async (id: string, course: number) => {
    const order = await ordersApi.marcia(id, course);
    setOrders((prev) => prev.map((o) => (o.id === id ? order : o)));
  }, []);

  const getOrdersForArea = useCallback(
    (area: string) =>
      orders.filter(
        (o) =>
          !["chiuso", "annullato"].includes(o.status) &&
          (o.area === area ||
            o.items.some((i) => {
              if (i.area !== area) return false;
              return i.course >= o.activeCourse;
            })),
      ),
    [orders],
  );

  const getOrdersForTable = useCallback(
    (table: string) =>
      orders.filter((o) => o.table === table && !["chiuso", "annullato"].includes(o.status)),
    [orders],
  );

  return (
    <Ctx.Provider value={{ orders, activeOrders, loading, loadError, stockAlerts, clearStockAlerts, createOrder, appendToOrder, patchStatus, patchActiveCourse, getOrdersForArea, getOrdersForTable, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
