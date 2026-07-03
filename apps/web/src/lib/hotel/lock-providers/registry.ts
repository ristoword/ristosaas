import { createStubLockAdapter } from "@/lib/hotel/lock-providers/stub-adapter";
import type { LockProviderInterface } from "@/lib/hotel/lock-providers/types";
import type { LockVendorId } from "@/modules/hotel/domain/mobile-access-types";

const VENDORS: Array<{ id: LockVendorId; name: string }> = [
  { id: "salto", name: "Salto" },
  { id: "assa_abloy", name: "ASSA ABLOY" },
  { id: "dormakaba", name: "Dormakaba" },
  { id: "onity", name: "Onity" },
  { id: "hafele", name: "Häfele" },
  { id: "ttlock", name: "TTLock" },
  { id: "nuki", name: "Nuki" },
  { id: "yale", name: "Yale" },
  { id: "visionline", name: "Visionline" },
  { id: "kisi", name: "Kisi" },
  { id: "openpath", name: "Openpath" },
  { id: "brivo", name: "Brivo" },
  { id: "remotelock", name: "RemoteLock" },
  { id: "internal", name: "RistoSimply Bridge" },
];

const adapters = new Map<LockVendorId, LockProviderInterface>(
  VENDORS.map((v) => [v.id, createStubLockAdapter(v.id, v.name)]),
);

export function listLockVendors() {
  return VENDORS;
}

export function getLockAdapter(vendorId: string): LockProviderInterface {
  const id = (vendorId in adapters ? vendorId : "internal") as LockVendorId;
  return adapters.get(id) ?? adapters.get("internal")!;
}
