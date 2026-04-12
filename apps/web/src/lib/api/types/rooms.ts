export type TableStatus = "libero" | "aperto" | "conto" | "sporco";

export type SalaTable = {
  id: string;
  nome: string;
  posti: number;
  x: number;
  y: number;
  forma: "tondo" | "quadrato";
  stato: TableStatus;
  roomId: string;
};

export type Room = {
  id: string;
  name: string;
  tables: number;
};
