import { describe, expect, it } from "vitest";
import { decryptDocument, encryptDocument } from "@/lib/hotel/guest-register-crypto";
import { italyAdapter } from "@/lib/hotel/guest-register-transmission/registry";
import type { GuestRegisterEntryDetail } from "@/modules/hotel/domain/guest-register-types";

describe("guest-register-crypto", () => {
  it("round-trips document encryption", () => {
    const plain = Buffer.from("test-document-data").toString("base64");
    const { iv, encrypted } = encryptDocument(plain);
    const decrypted = decryptDocument(iv, encrypted);
    expect(decrypted).toBe(plain);
  });
});

describe("italyAdapter", () => {
  const completeEntry: GuestRegisterEntryDetail = {
    id: "e1",
    tenantId: "t1",
    reservationId: "r1",
    stayId: null,
    roomId: null,
    status: "complete",
    transmissionStatus: "pending",
    transmissionCountry: "IT",
    arrivalDate: "2026-06-29",
    departureDate: "2026-07-01",
    guestCount: 1,
    adults: 1,
    children: 0,
    roomCode: "101",
    notes: null,
    lastTransmissionAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    persons: [
      {
        id: "p1",
        entryId: "e1",
        firstName: "Mario",
        lastName: "Rossi",
        sex: "M",
        dateOfBirth: "1990-01-01T00:00:00.000Z",
        placeOfBirth: "Roma",
        stateOfBirth: "IT",
        nationality: "IT",
        residenceCountry: "IT",
        address: "Via Roma 1",
        postalCode: "00100",
        city: "Roma",
        province: "RM",
        taxCode: "RSSMRA90A01H501Z",
        phone: null,
        email: null,
        documentType: "identity_card",
        documentNumber: "CA12345",
        documentIssueDate: null,
        documentExpiryDate: null,
        documentIssuingAuthority: null,
        isPrimary: true,
        sortOrder: 0,
        isComplete: true,
        ocrStatus: "verified",
        ocrPayload: null,
        ocrVerifiedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    attachments: [],
    transmissions: [],
    auditLogs: [],
  };

  it("validates complete Italian guest", () => {
    expect(italyAdapter.validate(completeEntry)).toBeNull();
  });

  it("rejects missing tax code for IT nationals", () => {
    const entry = {
      ...completeEntry,
      persons: [{ ...completeEntry.persons[0]!, taxCode: null, isComplete: true }],
    };
    expect(italyAdapter.validate(entry)).toMatch(/Codice fiscale/);
  });
});
