import type { UserRole } from "@/lib/auth/types";

export type ProductPlan = "restaurant_only" | "hotel_only" | "all_included";
export type AppVertical = "core" | "restaurant" | "hotel" | "integration";
export type AppFeature =
  | "restaurant"
  | "hotel"
  | "integration_room_charge"
  | "integration_unified_folio"
  | "integration_meal_plans";

export type TenantPlatformProfile = {
  tenantId: string;
  tenantName: string;
  plan: ProductPlan;
  enabledVerticals: AppVertical[];
  enabledFeatures: AppFeature[];
  internalRoles: UserRole[];
};

const plan = (process.env.NEXT_PUBLIC_PRODUCT_PLAN as ProductPlan | undefined) || "all_included";

const planToVerticals: Record<ProductPlan, AppVertical[]> = {
  restaurant_only: ["core", "restaurant"],
  hotel_only: ["core", "hotel"],
  all_included: ["core", "restaurant", "hotel", "integration"],
};

const planToFeatures: Record<ProductPlan, AppFeature[]> = {
  restaurant_only: ["restaurant"],
  hotel_only: ["hotel"],
  all_included: ["restaurant", "hotel", "integration_room_charge", "integration_unified_folio", "integration_meal_plans"],
};

export const tenantPlatformProfile: TenantPlatformProfile = {
  tenantId: process.env.NEXT_PUBLIC_TENANT_ID || "tenant_demo",
  tenantName: process.env.NEXT_PUBLIC_TENANT_NAME || "RistoSaaS Demo",
  plan,
  enabledVerticals: planToVerticals[plan],
  enabledFeatures: planToFeatures[plan],
  internalRoles: ["super_admin"],
};

export function hasVerticalEnabled(vertical?: AppVertical) {
  if (!vertical) return true;
  return tenantPlatformProfile.enabledVerticals.includes(vertical);
}

export function hasFeatureEnabled(feature?: AppFeature) {
  if (!feature) return true;
  return tenantPlatformProfile.enabledFeatures.includes(feature);
}

export function isInternalRole(role?: UserRole | null) {
  if (!role) return false;
  return tenantPlatformProfile.internalRoles.includes(role);
}
