import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMenuByTenantSlug } from "@/lib/db/repositories/public-menu.repository";
import { PublicMenuClient } from "../public-menu-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tenant: string; tableId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant: slug, tableId } = await params;
  const data = await getPublicMenuByTenantSlug(slug, { tableId });
  if (!data?.table) return { title: "Menu" };
  return {
    title: `Menu — ${data.tenantName} — ${data.table.nome}`,
    description: `Menu al tavolo ${data.table.nome} (${data.tenantName}).`,
    robots: { index: false, follow: false },
  };
}

/** Menu pubblico con QR tavolo: `/menu/{tenantSlug}/{tableId}` (`tableId` = id riga `RestaurantTable`). */
export default async function PublicMenuTablePage({ params }: Props) {
  const { tenant: slug, tableId } = await params;
  const data = await getPublicMenuByTenantSlug(slug, { tableId });
  if (!data?.table) notFound();

  return (
    <main className="min-h-screen bg-rw-bg px-4 py-10 text-rw-ink">
      <PublicMenuClient
        tenantName={data.tenantName}
        tenantSlug={data.tenantSlug}
        items={data.items}
        tableId={data.table.id}
        tableLabel={data.table.nome}
      />
    </main>
  );
}
