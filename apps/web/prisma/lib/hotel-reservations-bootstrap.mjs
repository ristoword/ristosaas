/**
 * Bootstrap prenotazioni hotel demo (condiviso tra seed e script backfill).
 */
const HOTEL_PLANS = new Set([
  "hotel_only",
  "all_included",
  "hotel_premium",
  "hotel_premium_gold",
]);

const BOOKING_LIST_STATUSES = ["in_attesa", "confermata"];

const SEED_RESERVATIONS = [
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

function dateAtMidnightUtc(daysFromToday) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d;
}

export async function ensureDefaultHotelReservations(tx, tenantId) {
  const roomCount = await tx.hotelRoom.count({ where: { tenantId } });
  if (roomCount === 0) return 0;

  const activeCount = await tx.hotelReservation.count({
    where: { tenantId, status: { in: BOOKING_LIST_STATUSES } },
  });
  if (activeCount >= 2) return 0;

  let added = 0;
  for (const seed of SEED_RESERVATIONS) {
    const reservationId = `${tenantId}_rw_book_${seed.suffix}`;
    const customerId = `${tenantId}_rw_guest_${seed.suffix}`;
    const existing = await tx.hotelReservation.findUnique({ where: { id: reservationId } });
    if (existing) continue;

    await tx.customer.upsert({
      where: { id: customerId },
      update: { tenantId, name: seed.guestName, email: seed.email, phone: seed.phone },
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
        nights: seed.nights,
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

export async function backfillAllTenantsHotelReservations(prisma) {
  const tenants = await prisma.tenant.findMany({ select: { id: true, plan: true, name: true } });
  let total = 0;
  for (const tenant of tenants) {
    if (!HOTEL_PLANS.has(tenant.plan)) continue;
    const added = await prisma.$transaction((tx) => ensureDefaultHotelReservations(tx, tenant.id));
    if (added > 0) {
      console.log(`  +${added} prenotazioni hotel → ${tenant.name} (${tenant.id})`);
      total += added;
    }
  }
  return total;
}
