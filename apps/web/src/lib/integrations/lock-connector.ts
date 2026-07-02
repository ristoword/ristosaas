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

function normalizeBridgeUrl(bridgeUrl: string): string | null {
  const trimmed = bridgeUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `http://${trimmed.replace(/\/$/, "")}`;
}

export async function encodeLockCredential(
  bridgeUrl: string,
  apiKey: string,
  vendor: string,
  payload: LockEncodeRequest,
): Promise<LockEncodeResult> {
  const base = normalizeBridgeUrl(bridgeUrl);
  if (!base) {
    return { success: false, errorMessage: "Bridge serrature non configurato (lockBridgeUrl)" };
  }
  const url = `${base}/encode`;
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, errorMessage: `Bridge serrature non raggiungibile: ${message}` };
  }
}

export async function revokeLockCredential(
  bridgeUrl: string,
  apiKey: string,
  credentialId: string,
): Promise<LockEncodeResult> {
  const base = normalizeBridgeUrl(bridgeUrl);
  if (!base) {
    return { success: false, errorMessage: "Bridge serrature non configurato" };
  }
  const url = `${base}/revoke`;
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, errorMessage: `Bridge serrature non raggiungibile: ${message}` };
  }
}
