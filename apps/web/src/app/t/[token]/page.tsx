import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PublicTablePayload = {
  tenantName: string;
  tenantSlug: string;
  tableId: string;
  roomName: string | null;
  tableName: string;
  seats: number;
};

async function fetchPublicTable(token: string): Promise<PublicTablePayload | null> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host");
  if (!host) return null;
  const url = `${proto}://${host}/api/public/table?token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicTablePayload;
  } catch {
    return null;
  }
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchPublicTable(token);
  if (!data) notFound();

  // Redirect to the public menu with the table pre-selected.
  // The menu page handles ordering, allergen display, etc.
  redirect(`/menu/${encodeURIComponent(data.tenantSlug)}/${encodeURIComponent(data.tableId)}`);
}
