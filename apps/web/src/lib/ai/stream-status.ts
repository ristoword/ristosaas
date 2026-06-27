/** Progressive status messages shown while AI prepares a response (by module context). */

const STATUS: Record<string, string[]> = {
  magazzino: [
    "AI sta analizzando…",
    "Analizzo il magazzino…",
    "Controllo scorte e lotti…",
    "Verifico movimenti e riordini…",
  ],
  cucina: [
    "AI sta analizzando…",
    "Analizzo la cucina…",
    "Controllo comande e ricette…",
    "Verifico il food cost…",
  ],
  supervisor: [
    "AI sta analizzando…",
    "Analizzo i KPI…",
    "Controllo margini e performance…",
    "Sto preparando il report…",
  ],
  hotel: [
    "AI sta analizzando…",
    "Analizzo l'hotel…",
    "Controllo prenotazioni e camere…",
    "Verifico arrivi e partenze…",
  ],
  cantina: [
    "AI sta analizzando…",
    "Analizzo la cantina…",
    "Controllo giacenze vini…",
    "Verifico margini e annate…",
  ],
  risto: [
    "Risto sta analizzando…",
    "Consulto i dati del gestionale…",
    "Verifico azioni da eseguire…",
    "Preparo la risposta…",
  ],
  prenotazioni: [
    "AI sta analizzando…",
    "Controllo le prenotazioni…",
    "Verifico disponibilità tavoli…",
    "Analizzo richieste clienti…",
  ],
  cassa: [
    "AI sta analizzando…",
    "Analizzo la cassa…",
    "Controllo pagamenti e conti…",
    "Verifico chiusure…",
  ],
  fornitori: [
    "AI sta analizzando…",
    "Controllo ordini fornitore…",
    "Verifico anagrafica fornitori…",
  ],
  customers: [
    "AI sta analizzando…",
    "Consulto profili clienti…",
    "Verifico preferenze e allergeni…",
  ],
  bar: ["AI sta analizzando…", "Controllo comande bar…", "Verifico scorte drink…"],
  pizzeria: ["AI sta analizzando…", "Controllo comande pizzeria…", "Verifico impasti…"],
  briefing: [
    "AI sta analizzando…",
    "Raccolgo dati operativi del giorno…",
    "Controllo prenotazioni e comande…",
    "Sto preparando il briefing…",
  ],
  staff: [
    "AI sta analizzando…",
    "Controllo performance staff…",
    "Verifico turni e premi…",
    "Sto preparando il report…",
  ],
  default: [
    "AI sta analizzando…",
    "Consulto i dati…",
    "Preparo la risposta…",
  ],
};

export function statusMessagesForContext(context: string): string[] {
  return STATUS[context] ?? STATUS.default;
}

export function pickStatusMessage(context: string, step: number): string {
  const list = statusMessagesForContext(context);
  return list[Math.min(step, list.length - 1)];
}
