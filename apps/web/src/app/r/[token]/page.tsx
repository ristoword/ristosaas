import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { RoomServiceGuestClient } from "./room-service-guest-client";

export const dynamic = "force-dynamic";

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  unit: string;
};

type RoomPayload = {
  tenantName: string;
  tenantSlug: string;
  room: { code: string; type: string; floor: number };
  catalog: CatalogItem[];
};

async function fetchRoomData(token: string): Promise<RoomPayload | null> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host");
  if (!host) return null;
  try {
    const res = await fetch(
      `${proto}://${host}/api/public/room?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as RoomPayload;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchRoomData(token);
  if (!data) return { title: "Room Service" };
  return {
    title: `Room Service — Camera ${data.room.code} | ${data.tenantName}`,
    description: `Ordina servizi in camera presso ${data.tenantName}`,
  };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchRoomData(token);
  if (!data) notFound();

  return (
    <RoomServiceGuestClient
      token={token}
      tenantName={data.tenantName}
      room={data.room}
      catalog={data.catalog}
    />
  );
}
