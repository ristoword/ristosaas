export type ParsedBookingDraft = {
  type: "booking";
  customerName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  table: string;
  notes: string;
  allergies: string;
  status: "in_attesa" | "confermata";
};

export type ParsedOrderDraft = {
  type: "order";
  table: string | null;
  covers: number | null;
  notes: string;
  items: Array<{ name: string; qty: number; note?: string }>;
};

export type ParsedEmailResult =
  | { type: "booking"; draft: ParsedBookingDraft; confidence: "high" | "medium" | "low" }
  | { type: "order"; draft: ParsedOrderDraft; confidence: "high" | "medium" | "low" }
  | { type: "unknown"; reason: string };

const BOOKING_HINTS = /\b(prenotaz|prenoto|tavolo|coperti|persone|ospiti|posti|pax|cena|pranzo|domani|stasera)\b/i;
const ORDER_HINTS = /\b(ordine|asporto|delivery|porta(?:re)? a casa|da asporto|menù|menu)\b/i;

function extractPhone(text: string): string {
  const m = text.match(/(?:\+39\s?)?(?:3\d{2}[\s.-]?\d{6,7}|0\d{1,4}[\s.-]?\d{5,8})/);
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
}

function extractGuests(text: string): number {
  const patterns = [
    /(\d{1,2})\s*(?:persone|coperti|ospiti|pax|posti)/i,
    /per\s+(\d{1,2})\b/i,
    /tavolo\s+(?:da|per)\s+(\d{1,2})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 40) return n;
    }
  }
  return 2;
}

function extractTime(text: string): string {
  const m = text.match(/\b([01]?\d|2[0-3])[:.h]([0-5]\d)\b/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  const words = text.match(/\b(alle|ore)\s+(\d{1,2})\b/i);
  if (words?.[2]) return `${words[2].padStart(2, "0")}:00`;
  return "20:00";
}

function extractDate(text: string, receivedAt: Date): string {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const dmyShort = text.match(/\b(\d{1,2})[/.-](\d{1,2})\b/);
  if (dmyShort) {
    const year = receivedAt.getUTCFullYear();
    return `${year}-${dmyShort[2].padStart(2, "0")}-${dmyShort[1].padStart(2, "0")}`;
  }
  if (/\boggi\b/i.test(text)) return receivedAt.toISOString().slice(0, 10);
  if (/\bdomani\b/i.test(text)) {
    const d = new Date(receivedAt);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(receivedAt);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function extractTable(text: string): string {
  const m = text.match(/\b(?:tavolo|table)\s*[#:]?\s*([A-Za-z0-9-]+)/i);
  return m?.[1] ?? "";
}

function extractOrderItems(text: string): Array<{ name: string; qty: number; note?: string }> {
  const items: Array<{ name: string; qty: number; note?: string }> = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^(\d{1,2})x?\s+(.+)$/i) || line.match(/^(.+?)\s+x\s*(\d{1,2})$/i);
    if (m) {
      const qty = parseInt(m[1].match(/^\d/) ? m[1] : m[2], 10);
      const name = (m[1].match(/^\d/) ? m[2] : m[1]).trim();
      if (name.length >= 2 && qty >= 1) items.push({ name, qty });
    }
  }
  return items.slice(0, 20);
}

export function parseInboundEmail(input: {
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
  receivedAt: Date;
}): ParsedEmailResult {
  const text = `${input.subject}\n${input.bodyText}`.trim();
  const lower = text.toLowerCase();
  const customerName = input.fromName || input.fromEmail.split("@")[0] || "Cliente email";
  const phone = extractPhone(text);
  const email = input.fromEmail;

  const bookingScore = (BOOKING_HINTS.test(lower) ? 2 : 0) + (/\bdata\b/i.test(lower) ? 1 : 0);
  const orderScore = (ORDER_HINTS.test(lower) ? 2 : 0) + (extractOrderItems(text).length > 0 ? 2 : 0);

  if (orderScore > bookingScore && orderScore >= 2) {
    const items = extractOrderItems(text);
    const draft: ParsedOrderDraft = {
      type: "order",
      table: extractTable(text) || null,
      covers: extractGuests(text),
      notes: `Da email: ${input.subject}\n\n${input.bodyText}`.slice(0, 4000),
      items: items.length > 0 ? items : [{ name: "Richiesta da email", qty: 1, note: input.subject }],
    };
    return { type: "order", draft, confidence: items.length > 0 ? "high" : "medium" };
  }

  if (bookingScore >= 1 || BOOKING_HINTS.test(lower)) {
    const guests = extractGuests(text);
    const date = extractDate(text, input.receivedAt);
    const time = extractTime(text);
    const draft: ParsedBookingDraft = {
      type: "booking",
      customerName,
      phone,
      email,
      date,
      time,
      guests,
      table: extractTable(text),
      notes: input.bodyText.slice(0, 2000),
      allergies: "",
      status: "in_attesa",
    };
    const confidence =
      date && time && guests >= 1 ? (phone ? "high" : "medium") : "low";
    return { type: "booking", draft, confidence };
  }

  return { type: "unknown", reason: "Nessuna prenotazione o ordine riconosciuto nel testo" };
}
