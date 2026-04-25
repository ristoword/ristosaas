import { notFound, redirect } from "next/navigation";
import { verifyTableToken } from "@/lib/security/table-token";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // 1. Verify HMAC token
  const parsed = verifyTableToken(token);
  if (!parsed) {
    // Token invalid — show friendly error instead of bare 404
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 max-w-sm">
          <p className="text-3xl mb-3">⚠️</p>
          <h1 className="text-xl font-bold text-white mb-2">Link non valido</h1>
          <p className="text-gray-400 text-sm">
            Questo QR code non è riconosciuto. Contatta il personale per assistenza.
          </p>
          <p className="text-gray-600 text-xs mt-4 font-mono break-all">err: invalid_token</p>
        </div>
      </main>
    );
  }

  // 2. Look up table directly in DB
  const table = await prisma.restaurantTable.findFirst({
    where: { id: parsed.tableId, tenantId: parsed.tenantId },
    select: {
      id: true,
      nome: true,
      tenant: { select: { slug: true, accessStatus: true, name: true } },
    },
  });

  if (!table) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 max-w-sm">
          <p className="text-3xl mb-3">🪑</p>
          <h1 className="text-xl font-bold text-white mb-2">Tavolo non trovato</h1>
          <p className="text-gray-400 text-sm">Questo tavolo non è più disponibile nel sistema.</p>
        </div>
      </main>
    );
  }

  if (table.tenant.accessStatus !== "active") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 max-w-sm">
          <p className="text-3xl mb-3">🔒</p>
          <h1 className="text-xl font-bold text-white mb-2">Struttura non attiva</h1>
          <p className="text-gray-400 text-sm">Contatta il personale.</p>
        </div>
      </main>
    );
  }

  if (!table.tenant.slug) {
    notFound();
  }

  // 3. Redirect to the public menu with table pre-selected
  redirect(`/menu/${encodeURIComponent(table.tenant.slug)}/${encodeURIComponent(table.id)}`);
}
