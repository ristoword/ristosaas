import { createInternalSignature, verifyInternalSignature } from "@/lib/security/internal-signature";

describe("internal-signature", () => {
  const secret = "super-secret-for-tests-123456789";
  const pathname = "/api/ai/proposals/schedule/daily";

  it("validates expected signature in clock window", () => {
    const timestampMs = Date.now();
    const signature = createInternalSignature(secret, timestampMs, "POST", pathname);
    expect(
      verifyInternalSignature({
        secret,
        timestampMs,
        providedSignature: signature,
        method: "POST",
        pathname,
      }),
    ).toBe(true);
  });

  it("rejects expired signatures", () => {
    const timestampMs = Date.now() - 10 * 60 * 1000;
    const signature = createInternalSignature(secret, timestampMs, "POST", pathname);
    expect(
      verifyInternalSignature({
        secret,
        timestampMs,
        providedSignature: signature,
        method: "POST",
        pathname,
      }),
    ).toBe(false);
  });

  it("rejects signatures for tampered path", () => {
    const timestampMs = Date.now();
    const signature = createInternalSignature(secret, timestampMs, "POST", pathname);
    expect(
      verifyInternalSignature({
        secret,
        timestampMs,
        providedSignature: signature,
        method: "POST",
        pathname: "/api/ai/proposals/schedule/monthly",
      }),
    ).toBe(false);
  });
});
