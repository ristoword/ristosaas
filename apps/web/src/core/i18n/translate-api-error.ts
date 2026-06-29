type TranslateFn = (key: string) => string;

const EXACT: Record<string, string> = {
  "Folio not found": "hotel.apiError.folioNotFound",
  "Folio chiuso": "hotel.apiError.folioClosed",
  "Folio bloccato": "hotel.apiError.folioLocked",
  "Addebito non trovato": "hotel.apiError.chargeNotFound",
  "Nessun addebito selezionato": "hotel.apiError.noChargesSelected",
  "Addebiti non trovati": "hotel.apiError.chargesNotFound",
  "Folio sorgente non trovato": "hotel.apiError.sourceFolioNotFound",
  "Source e target devono essere diversi": "hotel.apiError.sameFolioTransfer",
  "Prenotazione non trovata": "hotel.apiError.reservationNotFound",
  "Registrazione non trovata": "hotel.guestRegister.entry.notFound",
  "Ospite non trovato": "hotel.apiError.guestNotFound",
  "Task not found": "hotel.apiError.taskNotFound",
  "Room not found": "hotel.apiError.roomNotFound",
  "Errore caricamento": "hotel.apiError.loadFailed",
  "Errore salvataggio": "hotel.guestRegister.msg.saveErr",
  "Upload fallito": "hotel.guestRegister.msg.uploadErr",
  "Trasmissione fallita": "hotel.guestRegister.msg.transmitErr",
  "OCR verify fallito": "hotel.guestRegister.msg.ocrErr",
  "Analisi folio in corso…": "hotel.folio.ai.stream.analyzing",
  "AI sta analizzando il folio…": "hotel.folio.ai.analyzing",
  "AI sta analizzando…": "hotel.folio.ai.analyzing",
};

const PREFIX: [string, string][] = [
  ["Adapter non configurato", "hotel.apiError.adapterNotConfigured"],
  ["Unauthorized", "hotel.apiError.unauthorized"],
  ["Forbidden", "hotel.apiError.forbidden"],
];

export function translateApiError(message: string, t: TranslateFn): string {
  const trimmed = message.trim();
  const exactKey = EXACT[trimmed];
  if (exactKey) {
    const translated = t(exactKey);
    if (translated !== exactKey) return translated;
  }
  for (const [prefix, key] of PREFIX) {
    if (trimmed.startsWith(prefix)) {
      const translated = t(key);
      if (translated !== key) return translated;
    }
  }
  return message;
}

export function translateStreamStatus(message: string, t: TranslateFn): string {
  return translateApiError(message, t);
}
