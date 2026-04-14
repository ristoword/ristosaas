export function getOrCreateRequestId(headers: Headers): string {
  const incoming = headers.get("x-request-id");
  if (incoming && incoming.trim().length > 0) return incoming;
  return crypto.randomUUID();
}
