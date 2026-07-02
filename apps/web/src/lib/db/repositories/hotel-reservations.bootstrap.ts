import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type Tx = Prisma.TransactionClient;

type TenantPlanForDefaults =
  | "restaurant_only"
  | "hotel_only"
  | "all_included"
  | "risto_premium"
  | "risto_premium_gold"
  | "hotel_premium"
  | "hotel_premium_gold";

const HOTEL_PLANS: TenantPlanForDefaults[] = [
  "hotel_only",
  "all_included",
  "hotel_premium",
  "hotel_premium_gold",
];

const MIN_BOOKING_LIST_RESERVATIONS = 2;

const BOOKING_LIST_STATUSES = ["in_attesa", "confermata"] as const;

function tenantHasHotelPlan(plan: TenantPlanForDefaults): boolean {
  return HOTEL_PLANS.includes(plan);
}

function dateAtMidnightUtc(daysFromToday: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d;
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

type SeedReservation = {
  suffix: "a" | "b";
  guestName: string;
  email: string;
  phone: string;
  status: "confermata" | "in_attesa";
  channel: "desk" | "online";
  checkInOffset: number;
  nights: number;
  rate: string;
};

const SEED_RESERVATIONS: SeedReservation[] = [
  {
    suffix: "a",
    guestName: "Ospite Demo Reception",
    email: "demo.reception@ristosimply.local",
    phone: "+39 333 7000001",
    status: "confermata",
    channel: "desk",
    checkInOffset: 1,
    nights: 2,
    rate: "109.00",
  },
  {
    suffix: "b",
    guestName: "Ospite Demo Online",
    email: "demo.online@ristosimply.local",
    phone: "+39 333 7000002",
    status: "in_attesa",
    channel: "online",
    checkInOffset: 3,
    nights: 2,
    rate: "109.00",
  },
];

/**
 * Garantisce almeno 2 prenotazioni sulla lista pre-arrivo (confermata / in attesa).
 * Idempotente: usa ID deterministici per tenant (`{tenantId}_rw_book_a|b`).
 */
export async function ensureDefaultHotelReservations(
  tx: Tx,
  tenantId: string,
  plan: TenantPlanForDefaults,
): Promise<number> {
  if (!tenantHasHotelPlan(plan)) return 0;

  const roomCount = await tx.hotelRoom.count({ where: { tenantId } });
  if (roomCount === 0) return 0;

  const activeCount = await tx.hotelReservation.count({
    where: {
      tenantId,
      status: { in: [...BOOKING_LIST_STATUSES] },
    },
  });
  if (activeCount >= MIN_BOOKING_LIST_RESERVATIONS) return 0;

  let added = 0;
  for (const seed of SEED_RESERVATIONS) {
    const reservationId = `${tenantId}_rw_book_${seed.suffix}`;
    const customerId = `${tenantId}_rw_guest_${seed.suffix}`;

    const existing = await tx.hotelReservation.findUnique({ where: { id: reservationId } });
    if (existing) continue;

    await tx.customer.upsert({
      where: { id: customerId },
      update: {
        tenantId,
        name: seed.guestName,
        email: seed.email,
        phone: seed.phone,
      },
      create: {
        id: customerId,
        tenantId,
        name: seed.guestName,
        email: seed.email,
        phone: seed.phone,
        type: "new",
        visits: 0,
        totalSpent: 0,
        avgSpend: 0,
        allergies: "",
        preferences: "",
        notes: "Prenotazione demo bootstrap",
      },
    });

    const checkInDate = dateAtMidnightUtc(seed.checkInOffset);
    const checkOutDate = dateAtMidnightUtc(seed.checkInOffset + seed.nights);
    const nights = nightsBetween(checkInDate, checkOutDate);

    await tx.hotelReservation.create({
      data: {
        id: reservationId,
        tenantId,
        customerId,
        guestName: seed.guestName,
        phone: seed.phone,
        email: seed.email,
        checkInDate,
        checkOutDate,
        guests: 2,
        status: seed.status,
        roomType: "CLASSIC",
        boardType: "bed_breakfast",
        nights,
        rate: seed.rate,
        channel: seed.channel,
        documentCode: seed.status === "confermata" ? `DEMO-${seed.suffix.toUpperCase()}` : null,
        receptionNotes: "Prenotazione demo — lista prenotazioni",
        ratePlanName: "Classic B&B",
      },
    });
    added += 1;
  }

  return added;
}

export type HotelReservationsBackfillRow = { tenantId: string; reservationsAdded: number };

/** Idempotente: almeno 2 prenotazioni lista per ogni tenant hotel. */
export async function backfillHotelReservationsAllTenants(): Promise<HotelReservationsBackfillRow[]> {
  const tenants = await prisma.tenant.findMany({ select: { id: true, plan: true } });
  const out: HotelReservationsBackfillRow[] = [];

  for (const tenant of tenants) {
    const plan = tenant.plan as TenantPlanForDefaults;
    if (!tenantHasHotelPlan(plan)) {
      out.push({ tenantId: tenant.id, reservationsAdded: 0 });
      continue;
    }

    const reservationsAdded = await prisma.$transaction(
      async (tx) => {
        await tx.hotelRoom.count({ where: { tenantId: tenant.id } });
        return ensureDefaultHotelReservations(tx, tenant.id, plan);
      },
      { maxWait: 10_000, timeout: 60_000 },
    );

    out.push({ tenantId: tenant.id, reservationsAdded });
  }

  return out;
}
