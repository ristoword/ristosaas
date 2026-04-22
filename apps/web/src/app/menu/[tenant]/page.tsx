import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMenuByTenantSlug } from "@/lib/db/repositories/public-menu.repository";
import { PublicMenuClient } from "./public-menu-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant: slug } = await params;
  const data = await getPublicMenuByTenantSlug(slug);
  if (!data) return { title: "Menu" };
  return {
    title: `Menu — ${data.tenantName}`,
    description: `Menu pubblico di ${data.tenantName}.`,
    robots: { index: true, follow: true },
  };
}

export default async function PublicMenuPage({ params }: Props) {
  const { tenant: slug } = await params;
  const data = await getPublicMenuByTenantSlug(slug);
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-rw-bg px-4 py-10 text-rw-ink">
      <PublicMenuClient tenantName={data.tenantName} tenantSlug={data.tenantSlug} items={data.items} />
    </main>
  );
}
