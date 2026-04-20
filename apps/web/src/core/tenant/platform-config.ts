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

// ------------------------------------------------------------
// Plan → verticals / features (source of truth)
// ------------------------------------------------------------
export const planToVerticals: Record<ProductPlan, AppVertical[]> = {
  restaurant_only: ["core", "restaurant"],
  hotel_only: ["core", "hotel"],
  all_included: ["core", "restaurant", "hotel", "integration"],
};

export const planToFeatures: Record<ProductPlan, AppFeature[]> = {
  restaurant_only: ["restaurant"],
  hotel_only: ["hotel"],
  all_included: [
    "restaurant",
    "hotel",
    "integration_room_charge",
    "integration_unified_folio",
    "integration_meal_plans",
  ],
};

// ------------------------------------------------------------
// Runtime, mutable profile.
//
// Source of truth is the server (`/api/auth/me` returns `tenant.plan` +
// `tenant.features`). Until the client has fetched `me`, we keep a build-time
// fallback so SSR and first paint do not explode on older deployments.
// ------------------------------------------------------------
const fallbackPlan = (process.env.NEXT_PUBLIC_PRODUCT_PLAN as ProductPlan | undefined) || "all_included";
const fallbackTenantName = process.env.NEXT_PUBLIC_TENANT_NAME || "RistoSaaS";

export const tenantPlatformProfile: TenantPlatformProfile = {
  tenantId: "",
  tenantName: fallbackTenantName,
  plan: fallbackPlan,
  enabledVerticals: planToVerticals[fallbackPlan],
  enabledFeatures: planToFeatures[fallbackPlan],
  internalRoles: ["super_admin"],
};

type TenantProfileLike = {
  id?: string;
  name?: string;
  plan?: ProductPlan;
  features?: string[];
};

export function applyServerTenantProfile(input: TenantProfileLike | null | undefined) {
  if (!input) return;
  const plan = (input.plan as ProductPlan) || tenantPlatformProfile.plan;
  const verticals = planToVerticals[plan] ?? tenantPlatformProfile.enabledVerticals;
  const featuresFromServer = (input.features ?? []).filter((f): f is AppFeature =>
    ([
      "restaurant",
      "hotel",
      "integration_room_charge",
      "integration_unified_folio",
      "integration_meal_plans",
    ] as string[]).includes(f),
  ) as AppFeature[];
  const featureSet = featuresFromServer.length ? featuresFromServer : planToFeatures[plan];

  tenantPlatformProfile.tenantId = input.id ?? tenantPlatformProfile.tenantId;
  tenantPlatformProfile.tenantName = input.name ?? tenantPlatformProfile.tenantName;
  tenantPlatformProfile.plan = plan;
  tenantPlatformProfile.enabledVerticals = verticals;
  tenantPlatformProfile.enabledFeatures = featureSet;
}

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
