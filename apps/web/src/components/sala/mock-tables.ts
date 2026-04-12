import type { SalaTable } from "./types";

/** Dati dimostrativi: poi arriveranno dall’API unica backend. */
export const mockSalaTables: SalaTable[] = [
  { id: "t1", nome: "1", posti: 2, x: 8, y: 12, forma: "tondo", stato: "libero", roomId: "room1" },
  { id: "t2", nome: "2", posti: 4, x: 22, y: 10, forma: "quadrato", stato: "aperto", roomId: "room1" },
  { id: "t3", nome: "3", posti: 4, x: 38, y: 12, forma: "quadrato", stato: "aperto", roomId: "room1" },
  { id: "t4", nome: "4", posti: 6, x: 54, y: 8, forma: "tondo", stato: "conto", roomId: "room1" },
  { id: "t5", nome: "5", posti: 2, x: 72, y: 14, forma: "tondo", stato: "libero", roomId: "room1" },
  { id: "t6", nome: "6", posti: 8, x: 14, y: 42, forma: "quadrato", stato: "sporco", roomId: "room1" },
  { id: "t7", nome: "7", posti: 4, x: 32, y: 44, forma: "quadrato", stato: "libero", roomId: "room1" },
  { id: "t8", nome: "8", posti: 4, x: 50, y: 40, forma: "tondo", stato: "aperto", roomId: "room1" },
  { id: "t9", nome: "9", posti: 2, x: 68, y: 44, forma: "tondo", stato: "libero", roomId: "room1" },
  { id: "t10", nome: "10", posti: 10, x: 40, y: 68, forma: "quadrato", stato: "aperto", roomId: "room1" },
];
