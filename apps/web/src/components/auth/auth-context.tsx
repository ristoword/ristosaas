"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { applyServerTenantProfile, tenantPlatformProfile } from "@/core/tenant/platform-config";

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

export type TenantLicenseSummary = {
  status: "trial" | "active" | "expired" | "suspended";
  plan: "restaurant_only" | "hotel_only" | "all_included";
  billingCycle?: string;
  seats?: number;
  usedSeats?: number;
  expiresAt?: string | null;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug?: string;
  plan: "restaurant_only" | "hotel_only" | "all_included";
  accessStatus: "active" | "blocked";
  features: string[];
  license?: TenantLicenseSummary | null;
};

export type User = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  username?: string;
  mustChangePassword?: boolean;
  tenantId?: string;
  tenant?: TenantSummary | null;
};

type AuthContextValue = {
  user: User | null;
  tenant: TenantSummary | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
};

const Ctx = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

function syncTenantProfile(tenant: TenantSummary | null | undefined) {
  applyServerTenantProfile(tenant ?? null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then((data) => {
        if (data) {
          setUser(data as User);
          syncTenantProfile((data as User).tenant ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await api.auth.login(username, password);
      const nextUser = data.user as User;
      setUser(nextUser);
      // After login, pull fresh profile (auth/login response may not include tenant/features)
      try {
        const me = await api.auth.me();
        if (me) {
          setUser(me as User);
          syncTenantProfile((me as User).tenant ?? null);
        }
      } catch {
        /* non-fatal: keep shallow user */
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore di rete";
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {});
    setUser(null);
    syncTenantProfile(null);
    window.location.href = "/login";
  }, []);

  const hasRole = useCallback((role: UserRole | UserRole[]) => {
    if (!user) return false;
    if (user.role === "owner" || user.role === "super_admin") return true;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role as UserRole);
  }, [user]);

  return (
    <Ctx.Provider
      value={{
        user,
        tenant: user?.tenant ?? null,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// Convenience hooks
export function useTenant() {
  const { tenant } = useAuth();
  return tenant;
}

export function useTenantFeatures() {
  const tenant = useTenant();
  // Fall back to planToFeatures when license data is missing but plan is known.
  const features = tenant?.features ?? tenantPlatformProfile.enabledFeatures;
  return {
    plan: tenant?.plan ?? tenantPlatformProfile.plan,
    features,
    has(code: string) {
      return features.includes(code);
    },
    isRestaurantEnabled: features.includes("restaurant"),
    isHotelEnabled: features.includes("hotel"),
    isRoomChargeEnabled: features.includes("integration_room_charge"),
    isUnifiedFolioEnabled: features.includes("integration_unified_folio"),
    isMealPlansEnabled: features.includes("integration_meal_plans"),
  };
}
