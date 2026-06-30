import type { StockItem } from "@/lib/api/types/warehouse";
import { normalizeProductKey } from "@/lib/warehouse/bolla-import/categories";

export function matchWarehouseItem(description: string, items: StockItem[]): StockItem | null {
  const norm = normalizeProductKey(description);
  if (!norm) return null;

  const exact = items.find((i) => normalizeProductKey(i.name) === norm);
  if (exact) return exact;

  const contains = items.find((i) => {
    const iname = normalizeProductKey(i.name);
    return iname.length >= 4 && (norm.includes(iname) || iname.includes(norm));
  });
  if (contains) return contains;

  const tokens = norm.split(" ").filter((t) => t.length >= 3);
  let best: { item: StockItem; score: number } | null = null;
  for (const item of items) {
    const iname = normalizeProductKey(item.name);
    const itemTokens = iname.split(" ").filter((t) => t.length >= 3);
    const overlap = tokens.filter((t) => itemTokens.some((it) => it.includes(t) || t.includes(it))).length;
    if (overlap >= 2 && (!best || overlap > best.score)) {
      best = { item, score: overlap };
    }
  }
  return best?.item ?? null;
}
