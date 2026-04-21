/**
 * Tipologia camera allineata tra modulo Camere e Prenotazioni hotel.
 * Valori preset in maiuscolo (CLASSIC, …); "OTHER" + testo libero per custom.
 */

export const ROOM_TYPE_OPTIONS = [
  { label: "Classic", value: "CLASSIC" },
  { label: "Superior", value: "SUPERIOR" },
  { label: "Deluxe", value: "DELUXE" },
  { label: "Suite", value: "SUITE" },
  { label: "Altro", value: "OTHER" },
] as const;

export type RoomTypeSelectValue = (typeof ROOM_TYPE_OPTIONS)[number]["value"];

const PRESET_VALUES = new Set<string>(ROOM_TYPE_OPTIONS.map((o) => o.value));

/** Normalizza per confronto disponibilità / tariffe (Classic → CLASSIC, ecc.). */
export function canonicalRoomTypeKey(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const low = t.toLowerCase();
  if (low === "classic") return "CLASSIC";
  if (low === "superior") return "SUPERIOR";
  if (low === "deluxe") return "DELUXE";
  if (low === "suite") return "SUITE";
  if (t === "OTHER") return "OTHER";
  if (PRESET_VALUES.has(t)) return t;
  return t;
}

export function roomTypesMatch(a: string, b: string): boolean {
  return canonicalRoomTypeKey(a) === canonicalRoomTypeKey(b);
}

export function storedRoomTypeToSelectValue(roomType: string): RoomTypeSelectValue {
  const raw = roomType.trim();
  const low = raw.toLowerCase();
  if (low === "classic") return "CLASSIC";
  if (low === "superior") return "SUPERIOR";
  if (low === "deluxe") return "DELUXE";
  if (low === "suite") return "SUITE";
  if (raw === "OTHER") return "OTHER";
  if (PRESET_VALUES.has(raw)) return raw as RoomTypeSelectValue;
  return "OTHER";
}

/** Valore campo testo "Altro" quando il DB non è un preset noto. */
export function otherRoomTypeInputValue(roomType: string): string {
  const preset = storedRoomTypeToSelectValue(roomType);
  if (preset !== "OTHER") return "";
  const raw = roomType.trim();
  if (raw === "" || raw === "OTHER") return "";
  if (PRESET_VALUES.has(raw)) return "";
  if (["classic", "superior", "deluxe", "suite"].includes(raw.toLowerCase())) return "";
  return raw;
}
