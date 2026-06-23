import { NextRequest, NextResponse } from "next/server";
import { err, ok, body } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { getTenantId } from "@/lib/db/repositories/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { applyRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/security/rate-limit";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type ParsedItem = {
  name: string;
  qty: number;
  course: number;
  category: string;
  area: "cucina" | "bar" | "pizzeria";
  matchedMenuItemId: string | null;
  matchedPrice: number | null;
};

type ParsedOrder = {
  items: ParsedItem[];
  raw: string;
};

/**
 * POST /api/ai/parse-order
 *
 * Takes free-form voice text (e.g. "un tagliere di salumi, una burrata,
 * segue un risotto mare, una carbonara, segue un branzino, bevande un chianti 2025")
 * and returns structured order items split by course with fuzzy-matched menu items.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  const user = guard.user;
  const tenantId = user?.tenantId || getTenantId();

  const limitKey = `${clientIpFromRequest(req)}|${user?.id ?? "anon"}`;
  const rl = await applyRateLimit(limitKey, {
    bucket: "ai:parse-order",
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: `Troppe richieste. Riprova tra ${Math.ceil(rl.resetInMs / 1000)}s.` },
      { status: 429 },
    );
    for (const [k, v] of Object.entries(rateLimitHeaders(rl))) res.headers.set(k, v);
    return res;
  }

  const payload = await body<{ transcript?: string }>(req);
  const transcript = payload.transcript?.trim();
  if (!transcript) return err("transcript obbligatorio", 400);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return err("OPENAI_API_KEY non configurata", 500);

  const [menuItems, dailyDishes, wines] = await Promise.all([
    prisma.menuItem.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, category: true, area: true, price: true },
    }),
    prisma.dailyDish.findMany({
      where: { tenantId },
      select: { id: true, name: true, category: true, price: true },
    }),
    prisma.wineCellarItem.findMany({
      where: { tenantId, stock: { gt: 0 } },
      select: { id: true, name: true, sellingPrice: true, vintageYear: true, region: true },
    }),
  ]);

  const catalogLines: string[] = [];
  for (const m of menuItems) {
    catalogLines.push(`MENU|${m.id}|${m.name}|${m.category}|${m.area}|${Number(m.price).toFixed(2)}`);
  }
  for (const d of dailyDishes) {
    catalogLines.push(`DAILY|${d.id}|${d.name}|${d.category}|cucina|${Number(d.price).toFixed(2)}`);
  }
  for (const w of wines) {
    catalogLines.push(`WINE|${w.id}|${w.name}${w.vintageYear ? ` ${w.vintageYear}` : ""}|Cantina|bar|${Number(w.sellingPrice).toFixed(2)}`);
  }

  const systemPrompt = `Sei un parser di ordini ristorante. Il cameriere detta l'ordine a voce e tu devi estrarre i piatti strutturati.

REGOLE:
- La parola "SEGUE" o "seconda portata" / "terza portata" indica il cambio di portata (course). Se non specificato, la prima portata è 1.
- Le bevande sono sempre nell'ultima portata separata (course = il numero più alto).
- Ogni piatto ha: name, qty (default 1), course, category, area.
- area: "cucina" per cibo, "bar" per bevande/vini, "pizzeria" per pizze.
- category: Antipasti, Primi, Secondi, Pizze, Contorni, Dolci, Bevande, Cantina, ecc.
- Prova a matchare ogni piatto dettato con il catalogo del ristorante fornito sotto (match fuzzy per nome).
- Se trovi un match, riporta matchedId e matchedPrice. Se non trovi match esatto, metti matchedId=null.

CATALOGO RISTORANTE (formato: TIPO|ID|NOME|CATEGORIA|AREA|PREZZO):
${catalogLines.length > 0 ? catalogLines.join("\n") : "(catalogo vuoto)"}

Rispondi SOLO con JSON valido, nessun testo prima o dopo:
{
  "items": [
    { "name": "...", "qty": 1, "course": 1, "category": "...", "area": "cucina|bar|pizzeria", "matchedId": "...|null", "matchedPrice": 0.00 }
  ]
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.1,
        max_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return err(`OpenAI error: ${errorText}`, 502);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return err("AI non ha restituito JSON valido", 502);

    const parsed = JSON.parse(jsonMatch[0]) as { items?: Array<Record<string, unknown>> };

    const items: ParsedItem[] = (parsed.items ?? []).map((it) => ({
      name: String(it.name || ""),
      qty: Math.max(1, Number(it.qty) || 1),
      course: Math.max(1, Number(it.course) || 1),
      category: String(it.category || "Altro"),
      area: (["cucina", "bar", "pizzeria"].includes(String(it.area)) ? String(it.area) : "cucina") as "cucina" | "bar" | "pizzeria",
      matchedMenuItemId: it.matchedId ? String(it.matchedId) : null,
      matchedPrice: it.matchedPrice != null ? Number(it.matchedPrice) : null,
    }));

    return ok({ items, raw: transcript } satisfies ParsedOrder);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore parsing ordine", 502);
  }
}
