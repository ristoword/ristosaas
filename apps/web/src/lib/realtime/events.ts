import type { Order } from "@/lib/api-client";

export type OrderEventPayload = {
  order: Order;
  /** ISO timestamp when the order was persisted server-side */
  serverTimestamp: string;
};

export interface ServerToClientEvents {
  "order:created": (payload: OrderEventPayload) => void;
  "order:updated": (payload: OrderEventPayload) => void;
  "order:appended": (payload: OrderEventPayload) => void;
  "order:status_changed": (payload: OrderEventPayload & { previousStatus: string }) => void;
  "order:deleted": (payload: { orderId: string }) => void;
}

export interface ClientToServerEvents {
  "join:tenant": (tenantId: string) => void;
}

export type OrderEventName = keyof ServerToClientEvents;
