const ALLOGGIATI_SERVICE_URL =
  process.env.ALLOGGIATI_WEB_URL ??
  "https://alloggiatiweb.poliziadistato.it/service/service.asmx";

function soapEnvelope(action: string, inner: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${inner}</soap:Body>
</soap:Envelope>`;
}

async function soapCall(action: string, inner: string): Promise<string> {
  const res = await fetch(ALLOGGIATI_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/${action}"`,
    },
    body: soapEnvelope(action, inner),
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Alloggiati Web HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text;
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() ?? null;
}

export type AlloggiatiConfig = {
  username: string;
  password: string;
  wsKey: string;
  apartmentId: string;
};

export type AlloggiatiGuestLine = {
  tipoAlloggiato: string;
  dataArrivo: string;
  giorniPermanenza: number;
  cognome: string;
  nome: string;
  sesso: string;
  dataNascita: string;
  comuneNascita: string;
  provinciaNascita: string;
  statoNascita: string;
  cittadinanza: string;
  tipoDocumento: string;
  numeroDocumento: string;
  luogoRilascio: string;
};

function pad(value: string, len: number) {
  return value.slice(0, len).padEnd(len, " ");
}

function formatGuestLine(g: AlloggiatiGuestLine): string {
  return [
    pad(g.tipoAlloggiato, 2),
    pad(g.dataArrivo, 10),
    String(g.giorniPermanenza).padStart(2, "0"),
    pad(g.cognome, 50),
    pad(g.nome, 30),
    pad(g.sesso, 1),
    pad(g.dataNascita, 10),
    pad(g.comuneNascita, 50),
    pad(g.provinciaNascita, 2),
    pad(g.statoNascita, 9),
    pad(g.cittadinanza, 9),
    pad(g.tipoDocumento, 5),
    pad(g.numeroDocumento, 20),
    pad(g.luogoRilascio, 50),
  ].join("");
}

export async function alloggiatiGenerateToken(config: AlloggiatiConfig): Promise<string> {
  const inner = `<GenerateToken xmlns="http://tempuri.org/">
    <Utente>${config.username}</Utente>
    <Password>${config.password}</Password>
    <WsKey>${config.wsKey}</WsKey>
  </GenerateToken>`;
  const xml = await soapCall("GenerateToken", inner);
  const token = extractTag(xml, "GenerateTokenResult") ?? extractTag(xml, "token");
  if (!token) throw new Error("Token Alloggiati Web non ricevuto — verifica credenziali Questura");
  return token;
}

export async function alloggiatiSendGuests(
  config: AlloggiatiConfig,
  guests: AlloggiatiGuestLine[],
): Promise<{ externalRef: string; rawResponse: string }> {
  if (!guests.length) throw new Error("Nessun ospite da trasmettere");
  const token = await alloggiatiGenerateToken(config);
  const tabella = guests.map(formatGuestLine).join("\r\n");
  const inner = `<Send xmlns="http://tempuri.org/">
    <token>${token}</token>
    <idAppartamento>${config.apartmentId}</idAppartamento>
    <tabella>${tabella.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</tabella>
  </Send>`;
  const xml = await soapCall("Send", inner);
  const result = extractTag(xml, "SendResult") ?? extractTag(xml, "esito");
  if (result && /errore|error|ko/i.test(result)) {
    throw new Error(`Alloggiati Web rifiutato: ${result}`);
  }
  const externalRef = result || `AW-${Date.now()}`;
  return { externalRef, rawResponse: xml.slice(0, 4000) };
}

export async function alloggiatiTestConnection(config: AlloggiatiConfig) {
  const token = await alloggiatiGenerateToken(config);
  return { ok: true, tokenPreview: `${token.slice(0, 6)}…` };
}
