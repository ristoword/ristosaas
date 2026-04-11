"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { CourseStatus, Order, OrderItem, OrderStatus } from "./types";
import { mockOrders } from "./mock-orders";

type OrdersContextValue = {
  orders: Order[];
  activeOrders: Order[];
  createOrder: (o: Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status">) => void;
  patchStatus: (id: string, status: OrderStatus) => void;
  patchActiveCourse: (id: string, course: number) => void;
  getOrdersForArea: (area: string) => Order[];
  getOrdersForTable: (table: string) => Order[];
};

const Ctx = createContext<OrdersContextValue | null>(null);

export function useOrders() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrders must be inside OrdersProvider");
  return ctx;
}

function courseKey(n: number) {
  return String(n);
}

function getSortedCourses(items: OrderItem[]): number[] {
  const set = new Set(items.map((i) => i.course));
  return [...set].sort((a, b) => a - b);
}

function buildInitialCourseStates(items: OrderItem[]): Record<string, CourseStatus> {
  const nums = getSortedCourses(items);
  const cs: Record<string, CourseStatus> = {};
  if (!nums.length) return cs;
  const first = nums[0];
  for (const n of nums) {
    cs[courseKey(n)] = n === first ? "in_attesa" : "queued";
  }
  return cs;
}

let idCounter = 100;

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const activeOrders = orders.filter(
    (o) => !["chiuso", "annullato", "servito"].includes(o.status),
  );

  const createOrder = useCallback(
    (payload: Omit<Order, "id" | "createdAt" | "updatedAt" | "courseStates" | "activeCourse" | "status">) => {
      idCounter++;
      const now = new Date().toISOString();
      const courseStates = buildInitialCourseStates(payload.items);
      const nums = getSortedCourses(payload.items);
      const newOrder: Order = {
        ...payload,
        id: `ord-${Date.now()}-${idCounter}`,
        activeCourse: nums[0] ?? 1,
        courseStates,
        status: "in_attesa",
        createdAt: now,
        updatedAt: now,
      };
      setOrders((prev) => [newOrder, ...prev]);
    },
    [],
  );

  const patchStatus = useCallback((id: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const updated = { ...o, status, updatedAt: new Date().toISOString() };
        const cs = { ...o.courseStates };
        const nums = getSortedCourses(o.items);
        const current = nums.find((n) => cs[courseKey(n)] !== "servito");
        if (current == null) return { ...updated, courseStates: cs };

        if (status === "in_preparazione") {
          cs[courseKey(current)] = "in_preparazione";
          return { ...updated, courseStates: cs };
        }

        if (status === "pronto") {
          const lastN = nums[nums.length - 1];
          if (current !== lastN) {
            cs[courseKey(current)] = "servito";
            const next = nums.find((n) => cs[courseKey(n)] !== "servito");
            if (next != null) {
              cs[courseKey(next)] = "in_attesa";
              updated.activeCourse = next;
            }
            updated.status = "in_attesa";
          } else {
            cs[courseKey(current)] = "pronto";
            updated.status = "in_attesa";
          }
          return { ...updated, courseStates: cs };
        }

        if (status === "servito") {
          const lastN = nums[nums.length - 1];
          if (current === lastN && cs[courseKey(current)] === "pronto") {
            cs[courseKey(current)] = "servito";
            updated.status = "servito";
          }
          return { ...updated, courseStates: cs };
        }

        return { ...updated, courseStates: cs };
      }),
    );
  }, []);

  const patchActiveCourse = useCallback((id: string, course: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const cs = { ...o.courseStates };
        if (cs[courseKey(course)] === "queued") {
          cs[courseKey(course)] = "in_attesa";
        }
        return { ...o, activeCourse: course, courseStates: cs, updatedAt: new Date().toISOString() };
      }),
    );
  }, []);

  const getOrdersForArea = useCallback(
    (area: string) =>
      orders.filter(
        (o) =>
          !["chiuso", "annullato"].includes(o.status) &&
          (o.area === area || o.items.some((i) => i.area === area)),
      ),
    [orders],
  );

  const getOrdersForTable = useCallback(
    (table: string) =>
      orders.filter((o) => o.table === table && !["chiuso", "annullato"].includes(o.status)),
    [orders],
  );

  return (
    <Ctx.Provider
      value={{ orders, activeOrders, createOrder, patchStatus, patchActiveCourse, getOrdersForArea, getOrdersForTable }}
    >
      {children}
    </Ctx.Provider>
  );
}
