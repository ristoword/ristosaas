export type LockEncodeRequest = {
  roomCode: string;
  reservationId: string;
  validFrom: string;
  validUntil: string;
  guestName: string;
};

export type LockEncodeResult = {
  success: boolean;
  credentialId?: string;
  errorMessage?: string;
  rawResponse?: Record<string, unknown>;
};

export async function encodeLockCredential(
  bridgeUrl: string,
  apiKey: string,
  vendor: string,
  payload: LockEncodeRequest,
): Promise<LockEncodeResult> {
  if (!bridgeUrl?.trim()) {
    return { success: false, errorMessage: "Bridge serrature non configurato (lockBridgeUrl)" };
  }
  const url = bridgeUrl.replace(/\/$/, "") + "/encode";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      "X-Lock-Vendor": vendor,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    credentialId?: string;
    error?: string;
  };
  if (!res.ok) {
    return {
      success: false,
      errorMessage: data.error ?? `Bridge serrature HTTP ${res.status}`,
      rawResponse: data as Record<string, unknown>,
    };
  }
  return {
    success: true,
    credentialId: data.credentialId ?? `LOCK-${Date.now()}`,
    rawResponse: data as Record<string, unknown>,
  };
}

export async function revokeLockCredential(
  bridgeUrl: string,
  apiKey: string,
  credentialId: string,
): Promise<LockEncodeResult> {
  if (!bridgeUrl?.trim()) {
    return { success: false, errorMessage: "Bridge serrature non configurato" };
  }
  const url = bridgeUrl.replace(/\/$/, "") + "/revoke";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ credentialId }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: false, errorMessage: (data as { error?: string }).error ?? `HTTP ${res.status}` };
  }
  return { success: true, credentialId };
}
