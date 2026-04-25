import { notFound } from "next/navigation";
import { verifyRoomToken } from "@/lib/security/room-token";
import { prisma } from "@/lib/db/prisma";
import { RoomServiceGuestClient } from "./room-service-guest-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = verifyRoomToken(token);
  if (!parsed) return { title: "Room Service" };

  const [tenant, room] = await Promise.all([
    prisma.tenant.findFirst({ where: { id: parsed.tenantId }, select: { name: true } }),
    prisma.hotelRoom.findFirst({ where: { tenantId: parsed.tenantId, code: parsed.roomCode }, select: { code: true } }),
  ]);

  if (!tenant || !room) return { title: "Room Service" };
  return {
    title: `Room Service — Camera ${room.code} | ${tenant.name}`,
    description: `Ordina servizi in camera presso ${tenant.name}`,
  };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Verify HMAC token directly — no HTTP self-call needed
  const parsed = verifyRoomToken(token);
  if (!parsed) notFound();

  const [tenant, room, catalog] = await Promise.all([
    prisma.tenant.findFirst({
      where: { id: parsed.tenantId, accessStatus: "active" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.hotelRoom.findFirst({
      where: { tenantId: parsed.tenantId, code: parsed.roomCode },
      select: { id: true, code: true, roomType: true, floor: true },
    }),
    prisma.roomServiceCatalogItem.findMany({
      where: { tenantId: parsed.tenantId, active: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, unitPrice: true, unit: true },
    }),
  ]);

  if (!tenant) notFound();
  if (!room) notFound();

  return (
    <RoomServiceGuestClient
      token={token}
      tenantName={tenant.name}
      room={{ code: room.code, type: room.roomType, floor: room.floor }}
      catalog={catalog.map((c) => ({ ...c, unitPrice: Number(c.unitPrice) }))}
    />
  );
}
