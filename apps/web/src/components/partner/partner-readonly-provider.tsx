"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@/components/auth/auth-context";

type ReadOnlyContextValue = {
  isReadOnly: boolean;
  isPartner: boolean;
};

const Ctx = createContext<ReadOnlyContextValue>({ isReadOnly: false, isPartner: false });

export function PartnerReadOnlyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isPartner = user?.role === "partner";
  return <Ctx.Provider value={{ isReadOnly: isPartner, isPartner }}>{children}</Ctx.Provider>;
}

export function useReadOnlyMode() {
  return useContext(Ctx);
}

/** Props da applicare a pulsanti di mutazione quando il Partner è in sola lettura. */
export function useMutationGuard() {
  const { isReadOnly } = useReadOnlyMode();
  return {
    disabled: isReadOnly,
    "aria-disabled": isReadOnly,
    className: isReadOnly ? "pointer-events-none opacity-40" : undefined,
    hidden: isReadOnly,
  } as const;
}
