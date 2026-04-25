import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const ALL_ROLES = [
  "sala", "cucina", "bar", "pizzeria", "cassa", "magazzino", "staff",
  "supervisor", "owner", "super_admin", "hotel_manager", "reception", "housekeeping",
] as const;

const MAX_PER_CATEGORY = 5;

export type SearchResultItem = {
  id: string;
  type: "ordine" | "tavolo" | "staff" | "prenotazione" | "camera" | "voce_menu" | "cliente";
  title: string;
  subtitle: string;
  href: string;
};

/** GET /api/search?q=xxx — ricerca unificata */
export async function GET(req: NextRequest) {
  const guard = await requireApiUser(req, [...ALL_ROLES]);
  if (guard.error) return guard.error;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) return err("Query troppo corta (min 2 caratteri)", 400);
  if (q.length > 100) return err("Query troppo lunga", 400);

  const tenantId = getTenantId();
  const results: SearchResultItem[] = [];
  const search = { contains: q, mode: "insensitive" as const };

  // Ordini (table, waiter)
  try {
    const orders = await prisma.restaurantOrder.findMany({
      where: { tenantId, OR: [{ table: search }, { waiter: search }, { notes: search }] },
      orderBy: { createdAt: "desc" },
      take: MAX_PER_CATEGORY,
      select: { id: true, table: true, waiter: true, status: true, area: true, createdAt: true },
    });
    for (const o of orders) {
      results.push({
        id: o.id, type: "ordine",
        title: `Ordine ${o.table ? `Tavolo ${o.table}` : "Asporto"}`,
        subtitle: `${o.area} · ${o.status} · ${o.waiter}`,
        href: `/${o.area === "sala" ? "rooms" : o.area}`,
      });
    }
  } catch { /* non-fatal */ }

  // Tavoli
  try {
    const tables = await prisma.restaurantTable.findMany({
      where: { tenantId, nome: search },
      take: MAX_PER_CATEGORY,
      select: { id: true, nome: true, posti: true, stato: true },
    });
    for (const t of tables) {
      results.push({ id: t.id, type: "tavolo", title: `Tavolo ${t.nome}`, subtitle: `${t.posti} posti · ${t.stato}`, href: "/rooms" });
    }
  } catch { /* non-fatal */ }

  // Staff
  try {
    const staff = await prisma.staffMember.findMany({
      where: { tenantId, OR: [{ name: search }, { email: search }, { role: search }] },
      take: MAX_PER_CATEGORY,
      select: { id: true, name: true, role: true, status: true },
    });
    for (const s of staff) {
      results.push({ id: s.id, type: "staff", title: s.name, subtitle: `${s.role} · ${s.status}`, href: "/staff" });
    }
  } catch { /* non-fatal */ }

  // Prenotazioni ristorante
  try {
    const bookings = await prisma.booking.findMany({
      where: { tenantId, OR: [{ customerName: search }, { phone: search }, { email: search }] },
      take: MAX_PER_CATEGORY,
      orderBy: { date: "desc" },
      select: { id: true, customerName: true, date: true, time: true, status: true },
    });
    for (const b of bookings) {
      results.push({
        id: b.id, type: "prenotazione",
        title: b.customerName,
        subtitle: `${new Date(b.date).toLocaleDateString("it-IT")} ${b.time} · ${b.status}`,
        href: "/prenotazioni",
      });
    }
  } catch { /* non-fatal */ }

  // Camere hotel
  try {
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId, OR: [{ code: search }, { roomType: search }] },
      take: MAX_PER_CATEGORY,
      select: { id: true, code: true, roomType: true, status: true, floor: true },
    });
    for (const r of rooms) {
      results.push({
        id: r.id, type: "camera",
        title: `Camera ${r.code}`,
        subtitle: `Piano ${r.floor} · ${r.roomType} · ${r.status}`,
        href: "/hotel/rooms",
      });
    }
  } catch { /* non-fatal */ }

  // Voci menu
  try {
    const items = await prisma.menuItem.findMany({
      where: { tenantId, OR: [{ name: search }, { category: search }] },
      take: MAX_PER_CATEGORY,
      select: { id: true, name: true, category: true, price: true, active: true },
    });
    for (const item of items) {
      results.push({
        id: item.id, type: "voce_menu",
        title: item.name,
        subtitle: `${item.category} · €${Number(item.price).toFixed(2)}${item.active ? "" : " (non attivo)"}`,
        href: "/menu-admin",
      });
    }
  } catch { /* non-fatal */ }

  // Clienti / prenotazioni hotel
  try {
    const customers = await prisma.customer.findMany({
      where: { tenantId, OR: [{ name: search }, { email: search }, { phone: search }] },
      take: MAX_PER_CATEGORY,
      select: { id: true, name: true, email: true, type: true },
    });
    for (const c of customers) {
      results.push({
        id: c.id, type: "cliente",
        title: c.name,
        subtitle: `${c.type}${c.email ? ` · ${c.email}` : ""}`,
        href: "/customers",
      });
    }
  } catch { /* non-fatal */ }

  return ok({ query: q, results: results.slice(0, 30) });
}
