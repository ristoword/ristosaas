import { stayTotalFromNightly, sumVatFromChargeLines } from "@/lib/hotel/pricing";
import type { Customer, FolioCharge, GuestFolio, HotelReservation, RatePlan } from "@/lib/api-client";

export const FOLIO_SECTIONS = [
  "CAMERA",
  "EXTRA",
  "RISTORANTE",
  "BAR",
  "ROOM_SERVICE",
  "MINIBAR",
  "SPA",
  "LAVANDERIA",
  "PARCHEGGIO",
  "TELEFONO",
  "CATERING",
  "EVENTI",
  "TAX",
  "TASSA_DI_SOGGIORNO",
  "SCONTI",
  "RIMBORSI",
] as const;

export type FolioSection = (typeof FOLIO_SECTIONS)[number];
export type FolioSplitId = string;

export type FolioChargeRow = FolioCharge & {
  section: FolioSection;
  department: string;
  operator: string;
  qty: number;
  unitPrice: number;
  vatPct: number;
  total: number;
  status: "posted" | "payment" | "credit" | "void";
  time: string;
  date: string;
  split: FolioSplitId;
};

function parseSection(value: string | null | undefined, charge: FolioCharge): FolioSection {
  if (value && (FOLIO_SECTIONS as readonly string[]).includes(value)) {
    return value as FolioSection;
  }
  return mapChargeToSection(charge);
}

function parseSplitCode(value: string | undefined): FolioSplitId {
  return value?.trim() || "A";
}

export type FolioTimelineEvent = {
  id: string;
  at: string;
  kind: "check_in" | "room_change" | "consumption" | "payment" | "charge" | "note" | "check_out";
  title: string;
  detail: string;
  detailKey?: string;
  detailParams?: Record<string, string>;
  amount?: number;
};

export type FolioEconomics = {
  roomTotal: number;
  extraTotal: number;
  taxTotal: number;
  vatTotal: number;
  paidTotal: number;
  dueTotal: number;
  creditTotal: number;
  balance: number;
  projectedRoomRate: number;
};

export type FolioChargeFilters = {
  query: string;
  dateFrom: string;
  dateTo: string;
  section: FolioSection | "all";
  operator: string;
  status: string;
  amountMin: string;
  amountMax: string;
};

const SECTION_LABELS: Record<FolioSection, string> = {
  CAMERA: "Camera",
  EXTRA: "Extra",
  RISTORANTE: "Ristorante",
  BAR: "Bar",
  ROOM_SERVICE: "Room Service",
  MINIBAR: "Minibar",
  SPA: "SPA",
  LAVANDERIA: "Lavanderia",
  PARCHEGGIO: "Parcheggio",
  TELEFONO: "Telefono",
  CATERING: "Catering",
  EVENTI: "Eventi",
  TAX: "Tax",
  TASSA_DI_SOGGIORNO: "Tassa di soggiorno",
  SCONTI: "Sconti",
  RIMBORSI: "Rimborsi",
};

export function sectionLabel(section: FolioSection): string {
  return SECTION_LABELS[section];
}

export function folioSectionKey(section: FolioSection): string {
  return `hotel.folio.section.${section}`;
}

export function folioPaymentStatusKey(
  balance: number,
  status: GuestFolio["status"],
): { key: string; tone: "success" | "warn" | "danger" | "default" } {
  if (status === "closed") return { key: "hotel.folio.payStatus.settled", tone: "success" };
  if (balance <= 0.005) return { key: "hotel.folio.payStatus.credit", tone: "success" };
  if (balance > 500) return { key: "hotel.folio.payStatus.due", tone: "danger" };
  return { key: "hotel.folio.payStatus.partial", tone: "warn" };
}

export function folioStayStatusKey(status: HotelReservation["status"]): string {
  return `hotel.folio.stayStatus.${status}`;
}

export function folioBoardKey(board: HotelReservation["boardType"]): string {
  return `hotel.folio.board.${board}`;
}

export function folioPaymentMethodKey(description: string): string {
  const d = description.toLowerCase();
  if (d.includes("contanti") || d.includes("cash")) return "hotel.folio.paymentMethod.cash";
  if (d.includes("carta") || d.includes("card") || d.includes("pos")) return "hotel.folio.paymentMethod.card";
  if (d.includes("bonifico")) return "hotel.folio.paymentMethod.transfer";
  if (d.includes("voucher")) return "hotel.folio.paymentMethod.voucher";
  if (d.includes("city ledger") || d.includes("saldo interno") || d.includes("room_charge_settlement")) {
    return "hotel.folio.paymentMethod.cityLedger";
  }
  if (d.includes("caparra") || d.includes("deposito")) return "hotel.folio.paymentMethod.deposit";
  return "hotel.folio.paymentMethod.other";
}

export function folioTimelineTitleKey(kind: FolioTimelineEvent["kind"]): string {
  const map: Record<FolioTimelineEvent["kind"], string> = {
    check_in: "hotel.folio.timeline.checkIn",
    check_out: "hotel.folio.timeline.checkOut",
    payment: "hotel.folio.timeline.payment",
    charge: "hotel.folio.col.desc",
    consumption: "hotel.folio.col.desc",
    note: "hotel.folio.col.detail",
    room_change: "hotel.folio.col.action",
  };
  return map[kind];
}


function inferSectionFromDescription(description: string): FolioSection | null {
  const d = description.toLowerCase();
  if (d.includes("minibar")) return "MINIBAR";
  if (d.includes("spa") || d.includes("massag")) return "SPA";
  if (d.includes("lavander") || d.includes("laundry")) return "LAVANDERIA";
  if (d.includes("parchegg") || d.includes("parking")) return "PARCHEGGIO";
  if (d.includes("telefon") || d.includes("phone")) return "TELEFONO";
  if (d.includes("bar") || d.includes("cocktail") || d.includes("bevanda")) return "BAR";
  if (d.includes("iva") || d.includes("tax")) return "TAX";
  return null;
}

export function mapChargeToSection(charge: FolioCharge): FolioSection {
  if (charge.amount < 0 && charge.source === "payment") return "RIMBORSI";
  if (charge.source === "hotel") return "CAMERA";
  if (charge.source === "city_tax") return "TASSA_DI_SOGGIORNO";
  if (charge.source === "room_service") return "ROOM_SERVICE";
  if (charge.source === "meal_plan_credit") return "SCONTI";
  if (charge.source === "manual") return "EXTRA";
  if (charge.source === "restaurant") {
    return inferSectionFromDescription(charge.description) ?? "RISTORANTE";
  }
  return inferSectionFromDescription(charge.description) ?? "EXTRA";
}

export function mapSourceToDepartment(source: FolioCharge["source"]): string {
  const map: Record<FolioCharge["source"], string> = {
    hotel: "Front Office",
    restaurant: "Ristorante",
    manual: "Reception",
    city_tax: "Front Office",
    payment: "Cassa",
    meal_plan_credit: "PMS",
    room_service: "Room Service",
  };
  return map[source] ?? "Hotel";
}

export function enrichCharge(charge: FolioCharge): FolioChargeRow {
  const posted = new Date(charge.postedAt);
  const section = parseSection(charge.section, charge);
  const isPayment = charge.source === "payment" || charge.amount < 0;
  const lineVoid = charge.lineStatus === "void";
  return {
    ...charge,
    section,
    department: charge.department ?? mapSourceToDepartment(charge.source),
    operator: charge.operator ?? charge.createdByName ?? (charge.source === "payment" ? "Reception" : mapSourceToDepartment(charge.source)),
    qty: charge.quantity ?? 1,
    unitPrice: charge.unitPrice ?? Math.abs(charge.amount),
    vatPct: charge.vatPct ?? (section === "TASSA_DI_SOGGIORNO" ? 0 : 10),
    total: charge.amount,
    status: lineVoid ? "void" : charge.source === "meal_plan_credit" ? "credit" : isPayment ? "payment" : "posted",
    date: posted.toLocaleDateString("it-IT"),
    time: posted.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    split: parseSplitCode(charge.splitCode),
  };
}

export function chargesForFolio(charges: FolioCharge[], folioId: string): FolioChargeRow[] {
  return charges
    .filter((c) => c.folioId === folioId)
    .map(enrichCharge)
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
}

export function filterCharges(rows: FolioChargeRow[], filters: FolioChargeFilters): FolioChargeRow[] {
  const q = filters.query.trim().toLowerCase();
  const min = filters.amountMin ? Number(filters.amountMin) : null;
  const max = filters.amountMax ? Number(filters.amountMax) : null;
  return rows.filter((row) => {
    if (filters.section !== "all" && row.section !== filters.section) return false;
    if (filters.operator && !row.operator.toLowerCase().includes(filters.operator.toLowerCase())) return false;
    if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.dateFrom && row.postedAt.slice(0, 10) < filters.dateFrom) return false;
    if (filters.dateTo && row.postedAt.slice(0, 10) > filters.dateTo) return false;
    if (min != null && Math.abs(row.amount) < min) return false;
    if (max != null && Math.abs(row.amount) > max) return false;
    if (q) {
      const hay = `${row.description} ${row.section} ${row.department} ${row.operator}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function computeEconomics(
  rows: FolioChargeRow[],
  folio: GuestFolio,
  reservation: HotelReservation | null,
): FolioEconomics {
  let roomTotal = 0;
  let extraTotal = 0;
  let taxTotal = 0;
  let paidTotal = 0;
  let creditTotal = 0;

  for (const row of rows) {
    if (row.source === "payment") {
      paidTotal += -row.amount;
      continue;
    }
    if (row.source === "meal_plan_credit") {
      creditTotal += -row.amount;
      continue;
    }
    if (row.section === "CAMERA") roomTotal += row.amount;
    else if (row.section === "TASSA_DI_SOGGIORNO" || row.section === "TAX") taxTotal += row.amount;
    else extraTotal += row.amount;
  }

  const projectedRoomRate =
    reservation && roomTotal <= 0 ? stayTotalFromNightly(reservation.rate, reservation.nights) : 0;
  const vatTotal = sumVatFromChargeLines(
    rows.map((r) => ({ amount: r.amount, vatPct: r.vatPct, source: r.source, section: r.section })),
  );
  const balance = folio.balance;
  const dueTotal = Math.max(0, balance);
  const credit = balance < 0 ? -balance : creditTotal;

  return {
    roomTotal,
    extraTotal,
    taxTotal,
    vatTotal,
    paidTotal,
    dueTotal,
    creditTotal: credit,
    balance,
    projectedRoomRate,
  };
}

export function buildTimeline(
  rows: FolioChargeRow[],
  reservation: HotelReservation | null,
): FolioTimelineEvent[] {
  const events: FolioTimelineEvent[] = [];

  if (reservation) {
    events.push({
      id: `ci-${reservation.id}`,
      at: `${reservation.checkInDate}T14:00:00`,
      kind: reservation.status === "in_casa" ? "check_in" : "check_in",
      title: "Check-in",
      detail: "",
      detailKey: "hotel.folio.timeline.arrival",
      detailParams: { name: reservation.guestName },
    });
    if (reservation.status === "check_out") {
      events.push({
        id: `co-${reservation.id}`,
        at: `${reservation.checkOutDate}T11:00:00`,
        kind: "check_out",
        title: "Check-out",
        detail: "",
        detailKey: "hotel.folio.timeline.stayClosed",
      });
    }
  }

  for (const row of rows) {
    if (row.source === "payment") {
      events.push({
        id: row.id,
        at: row.postedAt,
        kind: "payment",
        title: "Pagamento registrato",
        detail: row.description,
        detailKey: "hotel.folio.timeline.paymentDesc",
        detailParams: { desc: row.description },
        amount: row.amount,
      });
    } else {
      events.push({
        id: row.id,
        at: row.postedAt,
        kind: row.source === "room_service" || row.source === "restaurant" ? "consumption" : "charge",
        title: row.section,
        detail: row.description,
        amount: row.amount,
      });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function reservationForFolio(
  folio: GuestFolio,
  reservations: HotelReservation[],
): HotelReservation | null {
  if (folio.reservationId) {
    return reservations.find((r) => r.id === folio.reservationId) ?? null;
  }
  return reservations.find((r) => r.customerId === folio.customerId && r.status === "in_casa") ?? null;
}

export function customerForFolio(folio: GuestFolio, customers: Customer[]): Customer | null {
  return customers.find((c) => c.id === folio.customerId) ?? null;
}

export function boardTypeLabel(board: HotelReservation["boardType"]): string {
  const map: Record<HotelReservation["boardType"], string> = {
    room_only: "Solo pernottamento",
    bed_breakfast: "Bed & Breakfast",
    half_board: "Mezza pensione",
    full_board: "Pensione completa",
  };
  return map[board] ?? board;
}

export function ratePlanLabel(reservation: HotelReservation | null, ratePlans: RatePlan[]): string {
  if (!reservation) return "—";
  const plan = ratePlans.find((p) => p.roomType === reservation.roomType && p.boardType === reservation.boardType);
  return plan?.name ?? reservation.roomType;
}

export function paymentStatusLabel(balance: number, status: GuestFolio["status"]): {
  label: string;
  tone: "success" | "warn" | "danger" | "default";
} {
  if (status === "closed") return { label: "Saldato", tone: "success" };
  if (balance <= 0.005) return { label: "A credito", tone: "success" };
  if (balance > 500) return { label: "Da saldare", tone: "danger" };
  return { label: "Parziale", tone: "warn" };
}

export function stayStatusLabel(reservation: HotelReservation | null): string {
  if (!reservation) return "—";
  const map: Record<HotelReservation["status"], string> = {
    confermata: "Confermata",
    in_casa: "In casa",
    check_out: "Check-out",
    cancellata: "Cancellata",
    no_show: "No show",
  };
  return map[reservation.status] ?? reservation.status;
}

export function parsePaymentMethod(description: string): string {
  const d = description.toLowerCase();
  if (d.includes("contanti") || d.includes("cash")) return "Contanti";
  if (d.includes("carta") || d.includes("card") || d.includes("pos")) return "Carta / POS";
  if (d.includes("bonifico")) return "Bonifico";
  if (d.includes("voucher")) return "Voucher";
  if (d.includes("city ledger") || d.includes("saldo interno") || d.includes("room_charge_settlement")) {
    return "City Ledger";
  }
  if (d.includes("caparra") || d.includes("deposito")) return "Caparra";
  return "Altro";
}

export function groupBySection(rows: FolioChargeRow[]): Map<FolioSection, FolioChargeRow[]> {
  const map = new Map<FolioSection, FolioChargeRow[]>();
  for (const section of FOLIO_SECTIONS) map.set(section, []);
  for (const row of rows) {
    map.get(row.section)?.push(row);
  }
  return map;
}

export function splitTotals(rows: FolioChargeRow[], assignments: Record<string, FolioSplitId>): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    if (row.source === "payment" || row.status === "void") continue;
    const split = assignments[row.id] ?? row.split;
    totals[split] = (totals[split] ?? 0) + row.amount;
  }
  return totals;
}
