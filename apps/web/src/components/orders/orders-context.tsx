"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ordersApi, type Order, type OrderStatus } from "@/lib/api-client";

type OrdersContextValue = {
  orders: Order[];
  activeOrders: Order[];
  loading: boolean;
  createOrder: (
    o: Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status" | "onlinePaymentStatus" | "stripeCheckoutSessionId">,
  ) => Promise<void>;
  patchStatus: (id: string, status: OrderStatus) => Promise<void>;
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.list();
      setOrders(data);
    } catch (e) {
      console.error("OrdersProvider refresh:", e instanceof Error ? e.message : e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const activeOrders = orders.filter(
    (o) => !["chiuso", "annullato", "servito"].includes(o.status),
  );

  const createOrder = useCallback(async (
    payload: Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status" | "onlinePaymentStatus" | "stripeCheckoutSessionId">,
  ) => {
    const order = await ordersApi.create(payload);
    setOrders((prev) => [order, ...prev]);
  }, []);

  const patchStatus = useCallback(async (id: string, status: OrderStatus) => {
    const { order } = await ordersApi.patchStatus(id, status);
    setOrders((prev) => prev.map((o) => (o.id === id ? order : o)));
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
              // Keep an order visible only while the selected area still has
              // items in the active (or upcoming) courses.
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
    <Ctx.Provider value={{ orders, activeOrders, loading, createOrder, patchStatus, patchActiveCourse, getOrdersForArea, getOrdersForTable, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
