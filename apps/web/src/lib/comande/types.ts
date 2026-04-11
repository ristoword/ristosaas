export type StatoCorso = "attesa" | "attivo" | "completato";

export type CorsoRiga = {
  id: string;
  ordine: number;
  stato: StatoCorso;
};

export type Comanda = {
  id: string;
  tavoloId: string;
  tavoloNome: string;
  coperti: number;
  corsi: CorsoRiga[];
  noteCucina: string;
  notePizzeria: string;
  noteBar: string;
  priorita: boolean;
  createdAt: number;
  archivedAt?: number;
};

export type InviaComandaInput = {
  tavoloId: string;
  tavoloNome: string;
  coperti: number;
  numCorsi: number;
  noteCucina: string;
  notePizzeria: string;
  noteBar: string;
};

export function tuttiCorsiCompletati(c: Comanda) {
  return c.corsi.length > 0 && c.corsi.every((x) => x.stato === "completato");
}

export function comandaApertaSuTavolo(c: Comanda) {
  return !tuttiCorsiCompletati(c);
}
