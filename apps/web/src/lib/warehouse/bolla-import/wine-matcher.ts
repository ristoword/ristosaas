import { normalizeProductKey } from "@/lib/warehouse/bolla-import/categories";

export type WineMatchItem = { id: string; name: string };

export function matchWineItem(description: string, wines: WineMatchItem[]): WineMatchItem | null {
  const norm = normalizeProductKey(description);
  if (!norm) return null;

  const exact = wines.find((w) => normalizeProductKey(w.name) === norm);
  if (exact) return exact;

  const contains = wines.find((w) => {
    const wname = normalizeProductKey(w.name);
    return wname.length >= 4 && (norm.includes(wname) || wname.includes(norm));
  });
  if (contains) return contains;

  const tokens = norm.split(" ").filter((t) => t.length >= 3);
  let best: { item: WineMatchItem; score: number } | null = null;
  for (const wine of wines) {
    const wname = normalizeProductKey(wine.name);
    const wineTokens = wname.split(" ").filter((t) => t.length >= 3);
    const overlap = tokens.filter((t) => wineTokens.some((wt) => wt.includes(t) || t.includes(wt))).length;
    if (overlap >= 2 && (!best || overlap > best.score)) {
      best = { item: wine, score: overlap };
    }
  }
  return best?.item ?? null;
}
