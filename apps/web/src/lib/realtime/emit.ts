import type { Order } from "@/lib/api/types/orders";
import { getIO } from "./socket-server";

function toApiOrder(order: Order) {
  return { ...order, serverTimestamp: new Date().toISOString() };
}

export function emitOrderCreated(tenantId: string, order: Order) {
  getIO()?.to(`tenant:${tenantId}`).emit("order:created", {
    order: order as never,
    serverTimestamp: new Date().toISOString(),
  });
}

export function emitOrderUpdated(tenantId: string, order: Order) {
  getIO()?.to(`tenant:${tenantId}`).emit("order:updated", {
    order: order as never,
    serverTimestamp: new Date().toISOString(),
  });
}

export function emitOrderAppended(tenantId: string, order: Order) {
  getIO()?.to(`tenant:${tenantId}`).emit("order:appended", {
    order: order as never,
    serverTimestamp: new Date().toISOString(),
  });
}

export function emitOrderStatusChanged(tenantId: string, order: Order, previousStatus: string) {
  getIO()?.to(`tenant:${tenantId}`).emit("order:status_changed", {
    order: order as never,
    serverTimestamp: new Date().toISOString(),
    previousStatus,
  });
}

export function emitOrderDeleted(tenantId: string, orderId: string) {
  getIO()?.to(`tenant:${tenantId}`).emit("order:deleted", { orderId });
}
