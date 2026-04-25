import { notFound } from "next/navigation";
import { verifyStaffToken } from "@/lib/security/staff-token";
import { prisma } from "@/lib/db/prisma";
import { BadgeClockClient } from "./badge-clock-client";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const parsed = verifyStaffToken(token);
  if (!parsed) {
    return (
      <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 max-w-sm">
          <p className="text-4xl mb-3">⚠️</p>
          <h1 className="text-xl font-bold text-white mb-2">Badge non valido</h1>
          <p className="text-gray-400 text-sm">Chiedi al responsabile di rigenerare il tuo badge.</p>
          <p className="text-gray-600 text-xs mt-3 font-mono">err: invalid_token</p>
        </div>
      </main>
    );
  }

  const [member, shifts] = await Promise.all([
    prisma.staffMember.findFirst({
      where: { id: parsed.staffId, tenantId: parsed.tenantId },
      select: { id: true, name: true, role: true, status: true },
    }),
    prisma.staffShift.findMany({
      where: {
        staffId: parsed.staffId,
        tenantId: parsed.tenantId,
        clockInAt: {
          gte: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"),
        },
      },
      orderBy: { clockInAt: "desc" },
      take: 5,
      select: { id: true, clockInAt: true, clockOutAt: true },
    }),
  ]);

  if (!member) {
    return (
      <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 max-w-sm">
          <p className="text-4xl mb-3">👤</p>
          <h1 className="text-xl font-bold text-white mb-2">Dipendente non trovato</h1>
          <p className="text-gray-400 text-sm">Questo badge non corrisponde a nessun dipendente attivo.</p>
        </div>
      </main>
    );
  }

  const openShift = shifts.find((s) => !s.clockOutAt);

  return (
    <BadgeClockClient
      token={token}
      staffId={member.id}
      staffName={member.name}
      staffRole={member.role}
      isClocked={!!openShift}
      todayShifts={shifts.map((s) => ({
        id: s.id,
        clockInAt: s.clockInAt.toISOString(),
        clockOutAt: s.clockOutAt?.toISOString() ?? null,
      }))}
    />
  );
}
