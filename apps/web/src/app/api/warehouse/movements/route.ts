import { NextRequest } from "next/server";
import { ok, err, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { warehouseRepository } from "@/lib/db/repositories/warehouse.repository";
import type { WarehouseLocation } from "@/lib/api/types/warehouse";
import { WAREHOUSE_LOCATIONS } from "@/lib/api/types/warehouse";

const WAREHOUSE_ROLES = ["magazzino", "supervisor", "owner", "super_admin"] as const;
const WAREHOUSE_READ_ROLES = ["magazzino", "cucina", "pizzeria", "bar", "supervisor", "owner", "super_admin"] as const;

function isValidLocation(v: unknown): v is WarehouseLocation {
  return typeof v === "string" && (WAREHOUSE_LOCATIONS as string[]).includes(v);
}

export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...WAREHOUSE_READ_ROLES]);
  if (guard.error) return guard.error;
  const movements = await warehouseRepository.listMovements(getTenantId());
  return ok(movements);
}

type MovementBody = {
  warehouseItemId: string;
  type: "carico" | "scarico" | "trasferimento" | "rettifica";
  qty: number;
  reason: string;
  fromLocation?: string;
  toLocation?: string;
  note?: string;
  /** Usato solo per tipo "rettifica": la nuova quantità assoluta. */
  newQty?: number;
};

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, [...WAREHOUSE_ROLES]);
  if (guard.error) return guard.error;

  const tenantId = getTenantId();
  const data = await body<MovementBody>(req);

  if (!data.warehouseItemId?.trim()) return err("warehouseItemId è obbligatorio");
  if (!data.type) return err("type è obbligatorio");

  const item = await warehouseRepository.getItem(tenantId, data.warehouseItemId);
  if (!item) return err("Prodotto non trovato in magazzino", 404);

  if (data.type === "trasferimento") {
    if (!isValidLocation(data.fromLocation)) return err("fromLocation non valida");
    if (!isValidLocation(data.toLocation)) return err("toLocation non valida");
    const movement = await warehouseRepository.transfer({
      tenantId,
      warehouseItemId: data.warehouseItemId,
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      qty: Number(data.qty),
      reason: data.reason?.trim() || "Trasferimento",
      note: data.note?.trim() || null,
    });
    return ok(movement, 201);
  }

  if (data.type === "rettifica") {
    const location: WarehouseLocation = isValidLocation(data.fromLocation) ? data.fromLocation : "MAGAZZINO_CENTRALE";
    const newQty = typeof data.newQty === "number" ? data.newQty : Number(data.qty);
    const movement = await warehouseRepository.rectify({
      tenantId,
      warehouseItemId: data.warehouseItemId,
      location,
      newQty,
      reason: data.reason?.trim() || "Rettifica inventario",
      note: data.note?.trim() || null,
    });
    return ok(movement, 201);
  }

  if (data.type === "carico") {
    if (!(Number(data.qty) > 0)) return err("qty deve essere > 0");
    const updated = await warehouseRepository.updateItem(tenantId, data.warehouseItemId, {
      qty: item.qty + Number(data.qty),
    });
    const movement = await warehouseRepository.createMovement({
      tenantId,
      warehouseItemId: data.warehouseItemId,
      type: "carico",
      qty: Number(data.qty),
      unit: item.unit,
      reason: data.reason?.trim() || "Carico manuale",
      fromLocation: null,
      toLocation: isValidLocation(data.toLocation) ? data.toLocation : "MAGAZZINO_CENTRALE",
      note: data.note?.trim() || null,
    });
    return ok({ item: updated, movement }, 201);
  }

  if (data.type === "scarico") {
    if (!(Number(data.qty) > 0)) return err("qty deve essere > 0");
    const fromLocation: WarehouseLocation = isValidLocation(data.fromLocation) ? data.fromLocation : "MAGAZZINO_CENTRALE";

    if (fromLocation === "MAGAZZINO_CENTRALE") {
      const nextQty = Math.max(0, item.qty - Number(data.qty));
      const updated = await warehouseRepository.updateItem(tenantId, data.warehouseItemId, { qty: nextQty });
      const movement = await warehouseRepository.createMovement({
        tenantId,
        warehouseItemId: data.warehouseItemId,
        type: "scarico",
        qty: Number(data.qty),
        unit: item.unit,
        reason: data.reason?.trim() || "Scarico manuale",
        fromLocation: "MAGAZZINO_CENTRALE",
        toLocation: null,
        note: data.note?.trim() || null,
      });
      return ok({ item: updated, movement }, 201);
    }

    // Scarico da reparto
    const result = await warehouseRepository.dischargeFromLocation({
      tenantId,
      warehouseItemId: data.warehouseItemId,
      location: fromLocation,
      qty: Number(data.qty),
      reason: data.reason?.trim() || "Scarico manuale",
      note: data.note?.trim() || null,
      allowFallback: false,
    });
    if (!result.ok) return err(result.alert ?? "Scarico fallito", 409);
    const updatedItem = await warehouseRepository.getItem(tenantId, data.warehouseItemId);
    return ok({ item: updatedItem, alert: result.alert }, 201);
  }

  return err("type non supportato", 400);
}
