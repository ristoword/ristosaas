import { AsyncLocalStorage } from "node:async_hooks";

const tenantContext = new AsyncLocalStorage<string>();

export function setTenantIdContext(tenantId: string | null | undefined) {
  if (!tenantId || tenantId.trim().length === 0) return;
  tenantContext.enterWith(tenantId);
}

export function getTenantIdFromRequest(_request: { headers: Headers }, fallbackTenantId?: string | null) {
  if (fallbackTenantId && fallbackTenantId.trim().length > 0) return fallbackTenantId;
  throw new Error("Tenant context is required");
}

export function getTenantId() {
  const scopedTenantId = tenantContext.getStore();
  if (scopedTenantId && scopedTenantId.trim().length > 0) return scopedTenantId;
  throw new Error("Tenant context is required");
}
