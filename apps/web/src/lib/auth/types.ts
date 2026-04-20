export type UserRole =
  | "owner"
  | "sala"
  | "cucina"
  | "cassa"
  | "supervisor"
  | "magazzino"
  | "staff"
  | "bar"
  | "pizzeria"
  | "hotel_manager"
  | "reception"
  | "housekeeping"
  | "super_admin";

export type ProductPlan = "restaurant_only" | "hotel_only" | "all_included";
export type LicenseStatus = "trial" | "active" | "expired" | "suspended";

export type TenantProfile = {
  id: string;
  name: string;
  slug?: string;
  plan: ProductPlan;
  accessStatus: "active" | "blocked";
  features: string[];
  license?: {
    status: LicenseStatus;
    plan: ProductPlan;
    billingCycle?: string;
    seats?: number;
    usedSeats?: number;
    expiresAt?: string | null;
  } | null;
};

export type PublicUser = {
  id: string;
  tenantId?: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  sessionVersion?: number;
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: number | null;
  isLocked?: boolean;
  tenant?: TenantProfile | null;
};
