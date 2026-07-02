/**
 * One-time fix: reservations created before nightly-rate semantics stored
 * total stay in `rate`. Converts to nightly: rate = rate / nights.
 *
 * Only touches confermata reservations (not yet checked in / folio posted).
 * Dry-run by default — pass --apply to write.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/fix-hotel-nightly-rates.mjs
 *   DATABASE_URL=... node scripts/fix-hotel-nightly-rates.mjs --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const rows = await prisma.hotelReservation.findMany({
    where: { status: "confermata", nights: { gt: 1 } },
    select: { id: true, guestName: true, rate: true, nights: true, checkInDate: true },
  });

  const candidates = rows.filter((row) => {
    const rate = row.rate.toNumber();
    const nights = row.nights;
    if (rate <= 0 || nights <= 1) return false;
    const nightly = rate / nights;
    // Heuristic: old totals were often round hundreds; nightly in sane hotel range
    return nightly >= 25 && nightly <= 5000 && Math.abs(nightly - Math.round(nightly * 100) / 100) < 0.01;
  });

  console.log(`Found ${candidates.length} confermata reservation(s) to normalize (dry-run=${!apply})`);
  for (const row of candidates) {
    const oldRate = row.rate.toNumber();
    const nightly = Math.round((oldRate / row.nights) * 100) / 100;
    console.log(
      `  ${row.id} ${row.guestName} check-in ${row.checkInDate.toISOString().slice(0, 10)}: €${oldRate} → €${nightly}/n (${row.nights}n)`,
    );
    if (apply) {
      await prisma.hotelReservation.update({
        where: { id: row.id },
        data: { rate: nightly },
      });
    }
  }
  if (apply && candidates.length > 0) {
    console.log("Done.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
