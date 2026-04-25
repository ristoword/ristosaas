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

  // 1. Verify HMAC token
  const parsed = verifyRoomToken(token);
  if (!parsed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 max-w-sm">
          <p className="text-3xl mb-3">⚠️</p>
          <h1 className="text-xl font-bold text-white mb-2">QR non riconosciuto</h1>
          <p className="text-gray-400 text-sm">
            Questo QR code non è valido. Chiama la reception per ordinare.
          </p>
          <p className="text-gray-600 text-xs mt-4 font-mono">err: invalid_token</p>
        </div>
      </main>
    );
  }

  // 2. Look up tenant, room and catalog directly in DB
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

  if (!tenant) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 max-w-sm">
          <p className="text-3xl mb-3">🏨</p>
          <h1 className="text-xl font-bold text-white mb-2">Struttura non trovata</h1>
          <p className="text-gray-400 text-sm">Contatta la reception per assistenza.</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 max-w-sm">
          <p className="text-3xl mb-3">🛏️</p>
          <h1 className="text-xl font-bold text-white mb-2">Camera {parsed.roomCode} non trovata</h1>
          <p className="text-gray-400 text-sm">
            Questa camera non è registrata nel sistema. Contatta la reception.
          </p>
          <p className="text-gray-600 text-xs mt-4 font-mono">room: {parsed.roomCode}</p>
        </div>
      </main>
    );
  }

  return (
    <RoomServiceGuestClient
      token={token}
      tenantName={tenant.name}
      room={{ code: room.code, type: room.roomType, floor: room.floor }}
      catalog={catalog.map((c) => ({ ...c, unitPrice: Number(c.unitPrice) }))}
    />
  );
}
