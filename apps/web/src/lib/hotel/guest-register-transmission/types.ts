import type { GuestRegisterCountry, GuestRegisterEntryDetail } from "@/modules/hotel/domain/guest-register-types";

export type TransmissionPayload = {
  entry: GuestRegisterEntryDetail;
  tenantId: string;
};

export type TransmissionResult = {
  success: boolean;
  externalRef?: string;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string;
};

export type AuthorityAdapter = {
  code: string;
  country: GuestRegisterCountry;
  name: string;
  validate(entry: GuestRegisterEntryDetail): string | null;
  transmit(payload: TransmissionPayload): Promise<TransmissionResult>;
};
