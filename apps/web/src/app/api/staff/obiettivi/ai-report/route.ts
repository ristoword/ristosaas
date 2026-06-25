import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";

const MANAGER_ROLES = ["supervisor", "owner", "super_admin"] as const;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req, MANAGER_ROLES);
  if (guard.error) return guard.error;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return err("OPENAI_API_KEY non configurata", 500);

  const tenantId = getTenantId();

  const today = new Date();
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);

  const orders = await prisma.restaurantOrder.findMany({
    where: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay }, status: { notIn: ["annullato"] } },
    include: { items: true },
  });

  const waiterStats: Record<string, { orders: number; revenue: number; covers: number; tables: Set<string>; items: number; premiumBottles: number }> = {};

  for (const order of orders) {
    const w = order.waiter || "Sconosciuto";
    if (!waiterStats[w]) waiterStats[w] = { orders: 0, revenue: 0, covers: 0, tables: new Set(), items: 0, premiumBottles: 0 };
    const s = waiterStats[w];
    s.orders++;
    s.covers += order.covers ?? 0;
    if (order.table) s.tables.add(order.table);
    for (const item of order.items) {
      const p = Number(item.price ?? 0);
      s.revenue += p * item.qty;
      s.items += item.qty;
      const lc = item.name.toLowerCase();
      if (p >= 40 && (lc.includes("vino") || lc.includes("bottiglia") || lc.includes("champagne") || lc.includes("prosecco"))) {
        s.premiumBottles += item.qty;
      }
    }
  }

  const rewards = await prisma.staffReward.findMany({
    where: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay } },
  });

  const shifts = await prisma.staffShift.findMany({
    where: { tenantId, clockInAt: { gte: startOfDay, lte: endOfDay } },
    include: { staffMember: { select: { name: true } } },
  });

  const staffSummary = Object.entries(waiterStats).map(([name, s]) => ({
    name,
    ordini: s.orders,
    coperti: s.covers,
    tavoli: s.tables.size,
    incasso: Math.round(s.revenue * 100) / 100,
    piatti_venduti: s.items,
    bottiglie_premium: s.premiumBottles,
    media_ordine: s.orders > 0 ? Math.round((s.revenue / s.orders) * 100) / 100 : 0,
  }));

  const rewardsSummary = rewards.map((r) => ({
    staffName: r.staffName,
    type: r.type,
    description: r.description,
    value: r.value ? Number(r.value) : null,
  }));

  const shiftsSummary = shifts.map((s) => ({
    name: s.staffMember.name,
    clockIn: s.clockInAt.toISOString(),
    clockOut: s.clockOutAt?.toISOString() ?? "in corso",
  }));

  const systemPrompt = `Sei il direttore AI di un ristorante. Analizza i dati giornalieri del personale e produci un report dettagliato e professionale in italiano.

Il report deve includere:
1. RIEPILOGO GENERALE: totale ordini, incasso, coperti del giorno
2. CLASSIFICA CAMERIERI: dal migliore al peggiore per incasso, con commenti su performance
3. ANALISI VENDITE PREMIUM: chi ha venduto bottiglie costose, upselling
4. PRESENZE E TURNI: chi è in servizio, ore lavorate
5. PREMI E RICONOSCIMENTI: premi assegnati oggi
6. RACCOMANDAZIONI AI: suggerimenti per migliorare performance, chi merita un premio, chi necessita formazione
7. VOTO GIORNATA: valutazione complessiva da 1 a 10

Sii preciso con i numeri, usa emoji per evidenziare punti importanti.
Formatta il report in modo leggibile con sezioni chiare.`;

  const userContent = JSON.stringify({
    data: today.toISOString().slice(0, 10),
    totale_ordini: orders.length,
    personale: staffSummary,
    premi_oggi: rewardsSummary,
    turni_oggi: shiftsSummary,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return err(`OpenAI error: ${res.status} ${detail}`, 502);
  }

  const json = await res.json();
  const report = json.choices?.[0]?.message?.content ?? "Nessun report generato.";

  return ok({ report, generatedAt: new Date().toISOString() });
}
