import { AsyncLocalStorage } from "node:async_hooks";

const FALLBACK_TENANT_ID = "tenant_demo";
const tenantContext = new AsyncLocalStorage<string>();

export function setTenantIdContext(tenantId: string | null | undefined) {
  if (!tenantId || tenantId.trim().length === 0) return;
  tenantContext.enterWith(tenantId);
}

export function getTenantIdFromRequest(request: { headers: Headers }, fallbackTenantId?: string | null) {
  const headerTenantId = request.headers.get("x-tenant-id");
  if (headerTenantId && headerTenantId.trim().length > 0) return headerTenantId;
  if (fallbackTenantId && fallbackTenantId.trim().length > 0) return fallbackTenantId;
  return process.env.NEXT_PUBLIC_TENANT_ID || process.env.TENANT_ID || FALLBACK_TENANT_ID;
}

export function getTenantId() {
  const scopedTenantId = tenantContext.getStore();
  if (scopedTenantId && scopedTenantId.trim().length > 0) return scopedTenantId;
  return process.env.NEXT_PUBLIC_TENANT_ID || process.env.TENANT_ID || FALLBACK_TENANT_ID;
}
