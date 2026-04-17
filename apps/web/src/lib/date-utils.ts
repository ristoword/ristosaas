/**
 * Shared date helpers. We intentionally work with YYYY-MM-DD strings because
 * that's the same shape the API returns for checkInDate / checkOutDate fields
 * and it avoids any Date ↔ timezone drift client-side.
 */

export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map((value) => parseInt(value, 10));
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatHumanDate(isoDate: string, locale = "it-IT"): string {
  const [y, m, d] = isoDate.split("-").map((value) => parseInt(value, 10));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function monthRangeIso(ref: Date = new Date()): { start: string; end: string } {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end) };
}
