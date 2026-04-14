import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error"],
});

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set in runtime environment");
  }

  const row = await prisma.$queryRawUnsafe("SELECT NOW() AS now");
  const now = Array.isArray(row) && row.length > 0 ? row[0]?.now : null;

  console.log(
    JSON.stringify(
      {
        ok: true,
        query: "SELECT NOW() AS now",
        now: now instanceof Date ? now.toISOString() : now,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
