import type { GuestRegisterEntryDetail } from "@/modules/hotel/domain/guest-register-types";
import { complianceRepository } from "@/lib/db/repositories/compliance.repository";
import {
  alloggiatiSendGuests,
  type AlloggiatiGuestLine,
} from "@/lib/integrations/alloggiati-web";
import type { AuthorityAdapter, TransmissionPayload, TransmissionResult } from "./types";

function baseValidate(entry: GuestRegisterEntryDetail): string | null {
  if (entry.persons.length === 0) return "Nessun ospite registrato";
  const incomplete = entry.persons.filter((p) => !p.isComplete);
  if (incomplete.length > 0) return `${incomplete.length} scheda/e ospite incomplete`;
  return null;
}

function mapPersonToAlloggiati(p: GuestRegisterEntryDetail["persons"][0], arrivalDate: string, days: number): AlloggiatiGuestLine {
  return {
    tipoAlloggiato: "16",
    dataArrivo: arrivalDate,
    giorniPermanenza: Math.max(1, days),
    cognome: p.lastName.toUpperCase(),
    nome: p.firstName.toUpperCase(),
    sesso: p.sex === "M" ? "M" : p.sex === "F" ? "F" : "N",
    dataNascita: p.dateOfBirth?.slice(0, 10) ?? "19000101",
    comuneNascita: p.placeOfBirth ?? "",
    provinciaNascita: p.province ?? "",
    statoNascita: p.stateOfBirth ?? p.nationality ?? "IT",
    cittadinanza: p.nationality ?? "IT",
    tipoDocumento: mapDocType(p.documentType),
    numeroDocumento: p.documentNumber ?? "",
    luogoRilascio: p.documentIssuingAuthority ?? "",
  };
}

function mapDocType(t: string | null | undefined) {
  if (t === "passport") return "PASOR";
  if (t === "driving_license") return "PATEN";
  if (t === "identity_card") return "IDENT";
  return "ALTRO";
}

function daysBetween(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86_400_000));
}

export const italyAdapter: AuthorityAdapter = {
  code: "it-alloggiati-web",
  country: "IT",
  name: "Italia — Alloggiati Web",
  validate(entry) {
    const base = baseValidate(entry);
    if (base) return base;
    const missingTax = entry.persons.filter((p) => p.nationality === "IT" && !p.taxCode);
    if (missingTax.length > 0) return "Codice fiscale richiesto per ospiti italiani";
    return null;
  },
  async transmit(payload: TransmissionPayload): Promise<TransmissionResult> {
    const config = await complianceRepository.get(payload.tenantId);
    if (!config.alloggiatiEnabled) {
      return {
        success: false,
        errorMessage:
          "Alloggiati Web non configurato. Vai in Area Owner → Integrazioni compliance e inserisci credenziali Questura.",
      };
    }
    if (!config.alloggiatiUsername || !config.alloggiatiPassword || !config.alloggiatiWsKey || !config.alloggiatiApartmentId) {
      return { success: false, errorMessage: "Credenziali Alloggiati Web incomplete" };
    }

    const arrival = payload.entry.arrivalDate.slice(0, 10).replace(/-/g, "");
    const days = daysBetween(payload.entry.arrivalDate, payload.entry.departureDate);
    const guests = payload.entry.persons.map((p) => mapPersonToAlloggiati(p, arrival, days));

    try {
      const result = await alloggiatiSendGuests(
        {
          username: config.alloggiatiUsername,
          password: config.alloggiatiPassword,
          wsKey: config.alloggiatiWsKey,
          apartmentId: config.alloggiatiApartmentId,
        },
        guests,
      );
      return {
        success: true,
        externalRef: result.externalRef,
        responsePayload: {
          adapter: "it-alloggiati-web",
          protocol: "SOAP",
          guestCount: guests.length,
          externalRef: result.externalRef,
          transmittedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

function notConfiguredAdapter(params: {
  code: string;
  country: AuthorityAdapter["country"];
  name: string;
}): AuthorityAdapter {
  return {
    code: params.code,
    country: params.country,
    name: params.name,
    validate(entry) {
      return baseValidate(entry);
    },
    async transmit(): Promise<TransmissionResult> {
      return {
        success: false,
        errorMessage: `Integrazione ${params.name} non ancora attiva — contatta supporto RistoSimply`,
      };
    },
  };
}

export const netherlandsAdapter = notConfiguredAdapter({
  code: "nl-konmar",
  country: "NL",
  name: "Olanda — KonMar",
});
export const belgiumAdapter = notConfiguredAdapter({
  code: "be-police-register",
  country: "BE",
  name: "Belgio — Registro Polizia",
});
export const germanyAdapter = notConfiguredAdapter({
  code: "de-meldewesen",
  country: "DE",
  name: "Germania — Meldewesen",
});
export const franceAdapter = notConfiguredAdapter({
  code: "fr-fichier-police",
  country: "FR",
  name: "Francia — Fichier Police",
});
export const spainAdapter = notConfiguredAdapter({
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
