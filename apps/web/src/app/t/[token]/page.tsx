import { notFound, redirect } from "next/navigation";
import { verifyTableToken } from "@/lib/security/table-token";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Verify HMAC token directly — no HTTP self-call needed
  const parsed = verifyTableToken(token);
  if (!parsed) notFound();

  const table = await prisma.restaurantTable.findFirst({
    where: { id: parsed.tableId, tenantId: parsed.tenantId },
    select: {
      id: true,
      tenant: { select: { slug: true, accessStatus: true } },
    },
  });

  if (!table) notFound();
  if (table.tenant.accessStatus !== "active") notFound();

  // Redirect directly to the public menu with table pre-selected
  redirect(`/menu/${encodeURIComponent(table.tenant.slug)}/${encodeURIComponent(table.id)}`);
}
