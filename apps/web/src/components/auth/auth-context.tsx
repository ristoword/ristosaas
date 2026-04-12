"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export type UserRole = "owner" | "sala" | "cucina" | "cassa" | "supervisor" | "magazzino" | "staff" | "bar" | "pizzeria" | "super_admin";

export type User = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  username?: string;
};

type AuthContextValue = {
  user: User | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then((data) => { if (data) setUser(data as User); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await api.auth.login(username, password);
      setUser(data.user as User);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore di rete";
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {});
    setUser(null);
    window.location.href = "/login";
  }, []);

  const hasRole = useCallback((role: UserRole | UserRole[]) => {
    if (!user) return false;
    if (user.role === "owner" || user.role === "super_admin") return true;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role as UserRole);
  }, [user]);

  return (
    <Ctx.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, hasRole }}>
      {children}
    </Ctx.Provider>
  );
}
