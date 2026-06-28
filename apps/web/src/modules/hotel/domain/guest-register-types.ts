export type GuestRegisterEntryStatus = "draft" | "incomplete" | "complete" | "checked_out";
export type GuestRegisterTransmissionStatus = "pending" | "sent" | "error" | "cancelled";
export type GuestRegisterPersonSex = "M" | "F" | "X" | "unknown";
export type GuestRegisterDocumentType = "passport" | "identity_card" | "driving_license" | "visa" | "other";
export type GuestRegisterAttachmentType =
  | "document_front"
  | "document_back"
  | "passport"
  | "visa"
  | "driving_license"
  | "receipt"
  | "contract"
  | "signature_privacy"
  | "signature_checkin"
  | "signature_rules";
export type GuestRegisterOcrStatus = "none" | "pending" | "completed" | "verified" | "failed";
export type GuestRegisterCountry = "IT" | "NL" | "BE" | "DE" | "FR" | "ES";

export type GuestRegisterPerson = {
  id: string;
  entryId: string;
  firstName: string;
  lastName: string;
  sex: GuestRegisterPersonSex;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  stateOfBirth: string | null;
  nationality: string | null;
  residenceCountry: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  taxCode: string | null;
  phone: string | null;
  email: string | null;
  documentType: GuestRegisterDocumentType | null;
  documentNumber: string | null;
  documentIssueDate: string | null;
  documentExpiryDate: string | null;
  documentIssuingAuthority: string | null;
  isPrimary: boolean;
  sortOrder: number;
  isComplete: boolean;
  ocrStatus: GuestRegisterOcrStatus;
  ocrPayload: Record<string, unknown> | null;
  ocrVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuestRegisterAttachmentMeta = {
  id: string;
  entryId: string;
  personId: string | null;
  type: GuestRegisterAttachmentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type GuestRegisterTransmission = {
  id: string;
  entryId: string;
  country: GuestRegisterCountry;
  adapterCode: string;
  status: GuestRegisterTransmissionStatus;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  errorMessage: string | null;
  externalRef: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type GuestRegisterAuditLog = {
  id: string;
  entryId: string | null;
  personId: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  userName: string | null;
  ip: string | null;
  createdAt: string;
};

export type GuestRegisterEntry = {
  id: string;
  tenantId: string;
  reservationId: string;
  stayId: string | null;
  roomId: string | null;
  status: GuestRegisterEntryStatus;
  transmissionStatus: GuestRegisterTransmissionStatus;
  transmissionCountry: GuestRegisterCountry;
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  adults: number;
  children: number;
  roomCode: string | null;
  notes: string | null;
  lastTransmissionAt: string | null;
  createdAt: string;
  updatedAt: string;
  guestName?: string | null;
  reservationStatus?: string | null;
};

export type GuestRegisterEntryDetail = GuestRegisterEntry & {
  persons: GuestRegisterPerson[];
  attachments: GuestRegisterAttachmentMeta[];
  transmissions: GuestRegisterTransmission[];
  auditLogs: GuestRegisterAuditLog[];
};

export type GuestRegisterDashboard = {
  date: string;
  arrivalsToday: number;
  departuresToday: number;
  guestsPresent: number;
  toRegister: number;
  incomplete: number;
  sent: number;
  transmissionErrors: number;
  nationalityBreakdown: { nationality: string; count: number }[];
  statusBreakdown: { status: GuestRegisterEntryStatus; count: number }[];
  transmissionBreakdown: { status: GuestRegisterTransmissionStatus; count: number }[];
};

export type GuestRegisterSearchParams = {
  query?: string;
  firstName?: string;
  lastName?: string;
  roomCode?: string;
  documentNumber?: string;
  nationality?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  departureFrom?: string;
  departureTo?: string;
  transmissionStatus?: GuestRegisterTransmissionStatus;
  status?: GuestRegisterEntryStatus;
  page?: number;
  pageSize?: number;
};

export type GuestRegisterSearchResult = {
  items: GuestRegisterEntry[];
  total: number;
  page: number;
  pageSize: number;
};

export type OcrExtractedFields = {
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  documentExpiryDate?: string;
  documentType?: GuestRegisterDocumentType;
  sex?: GuestRegisterPersonSex;
  placeOfBirth?: string;
};
