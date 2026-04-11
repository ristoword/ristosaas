export type TableStatus = "libero" | "aperto" | "conto" | "sporco";

export type SalaTable = {
  id: string;
  nome: string;
  posti: number;
  /** posizione percentuale sulla planimetria */
  x: number;
  y: number;
  forma: "tondo" | "quadrato";
  stato: TableStatus;
};

export type NoteDestinazione = "cucina" | "pizzeria" | "bar";
