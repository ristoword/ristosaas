import type { GuestRegisterEntryDetail } from "@/modules/hotel/domain/guest-register-types";
import type { AuthorityAdapter, TransmissionPayload, TransmissionResult } from "./types";

function baseValidate(entry: GuestRegisterEntryDetail): string | null {
  if (entry.persons.length === 0) return "Nessun ospite registrato";
  const incomplete = entry.persons.filter((p) => !p.isComplete);
  if (incomplete.length > 0) return `${incomplete.length} scheda/e ospite incomplete`;
  return null;
}

function buildRequest(entry: GuestRegisterEntryDetail) {
  return {
    reservationId: entry.reservationId,
    roomCode: entry.roomCode,
    arrivalDate: entry.arrivalDate,
    departureDate: entry.departureDate,
    guestCount: entry.guestCount,
    persons: entry.persons.map((p) => ({
      firstName: p.firstName,
      lastName: p.lastName,
      nationality: p.nationality,
      documentType: p.documentType,
      documentNumber: p.documentNumber,
      dateOfBirth: p.dateOfBirth,
    })),
  };
}

function createStubAdapter(params: {
  code: string;
  country: AuthorityAdapter["country"];
  name: string;
  extraValidate?: (entry: GuestRegisterEntryDetail) => string | null;
}): AuthorityAdapter {
  return {
    code: params.code,
    country: params.country,
    name: params.name,
    validate(entry) {
      const base = baseValidate(entry);
      if (base) return base;
      return params.extraValidate?.(entry) ?? null;
    },
    async transmit(payload: TransmissionPayload): Promise<TransmissionResult> {
      const request = buildRequest(payload.entry);
      const externalRef = `${params.code}-${Date.now()}-${payload.entry.id.slice(-6)}`;
      return {
        success: true,
        externalRef,
        responsePayload: {
          adapter: params.code,
          country: params.country,
          status: "accepted",
          protocolVersion: "1.0",
          receivedAt: new Date().toISOString(),
          guestCount: payload.entry.persons.length,
          requestSummary: request,
          note: `Trasmissione accettata da adapter ${params.name} (layer PMS — collegare connettore istituzionale)`,
        },
      };
    },
  };
}

export const italyAdapter = createStubAdapter({
  code: "it-alloggiati-web",
  country: "IT",
  name: "Italia — Alloggiati Web",
  extraValidate(entry) {
    const missingTax = entry.persons.filter((p) => p.nationality === "IT" && !p.taxCode);
    if (missingTax.length > 0) return "Codice fiscale richiesto per ospiti italiani";
    return null;
  },
});

export const netherlandsAdapter = createStubAdapter({
  code: "nl-konmar",
  country: "NL",
  name: "Olanda — KonMar",
});

export const belgiumAdapter = createStubAdapter({
  code: "be-police-register",
  country: "BE",
  name: "Belgio — Registro Polizia",
});

export const germanyAdapter = createStubAdapter({
  code: "de-meldewesen",
  country: "DE",
  name: "Germania — Meldewesen",
});

export const franceAdapter = createStubAdapter({
  code: "fr-fichier-police",
  country: "FR",
  name: "Francia — Fichier Police",
});

export const spainAdapter = createStubAdapter({
  code: "es-hospedajes",
  country: "ES",
  name: "Spagna — Hospedajes SES",
});

const ADAPTERS: AuthorityAdapter[] = [
  italyAdapter,
  netherlandsAdapter,
  belgiumAdapter,
  germanyAdapter,
  franceAdapter,
  spainAdapter,
];

export function getAdapter(country: AuthorityAdapter["country"]): AuthorityAdapter {
  const adapter = ADAPTERS.find((a) => a.country === country);
  if (!adapter) throw new Error(`Adapter non configurato per paese ${country}`);
  return adapter;
}

export function listAdapters() {
  return ADAPTERS.map((a) => ({ code: a.code, country: a.country, name: a.name }));
}

export async function transmitToAuthority(
  country: AuthorityAdapter["country"],
  payload: TransmissionPayload,
): Promise<TransmissionResult & { adapterCode: string }> {
  const adapter = getAdapter(country);
  const validationError = adapter.validate(payload.entry);
  if (validationError) {
    return { success: false, adapterCode: adapter.code, errorMessage: validationError };
  }
  const result = await adapter.transmit(payload);
  return { ...result, adapterCode: adapter.code };
}
