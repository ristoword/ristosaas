const FALLBACK_TENANT_ID = "tenant_demo";

export function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || FALLBACK_TENANT_ID;
}
