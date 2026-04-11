import type { Order } from "./types";

let counter = 0;
function uid() {
  counter++;
  return `ord-${Date.now()}-${counter}`;
}

export const mockOrders: Order[] = [
  {
    id: uid(),
    table: "5",
    covers: 4,
    area: "sala",
    waiter: "Marco",
    notes: "Allergia noci",
    items: [
      { id: "i1", name: "Bruschetta mista", qty: 2, category: "antipasti", area: "cucina", price: 8, note: null, course: 1 },
      { id: "i2", name: "Supplì al telefono", qty: 4, category: "antipasti", area: "cucina", price: 3, note: null, course: 1 },
      { id: "i3", name: "Carbonara", qty: 2, category: "primi", area: "cucina", price: 12, note: "senza guanciale extra", course: 2 },
      { id: "i4", name: "Amatriciana", qty: 2, category: "primi", area: "cucina", price: 11, note: null, course: 2 },
      { id: "i5", name: "Tagliata", qty: 3, category: "secondi", area: "cucina", price: 18, note: null, course: 3 },
      { id: "i6", name: "Negroni", qty: 2, category: "cocktail", area: "bar", price: 9, note: null, course: 1 },
    ],
    activeCourse: 1,
    courseStates: { "1": "in_preparazione", "2": "queued", "3": "queued" },
    status: "in_preparazione",
    createdAt: new Date(Date.now() - 900000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: uid(),
    table: "3",
    covers: 2,
    area: "sala",
    waiter: "Laura",
    notes: "",
    items: [
      { id: "i7", name: "Margherita", qty: 1, category: "pizze", area: "pizzeria", price: 8, note: null, course: 1 },
      { id: "i8", name: "Diavola", qty: 1, category: "pizze", area: "pizzeria", price: 10, note: "doppia mozzarella", course: 1 },
      { id: "i9", name: "Birra media", qty: 2, category: "bevande", area: "bar", price: 5, note: null, course: 1 },
    ],
    activeCourse: 1,
    courseStates: { "1": "in_attesa" },
    status: "in_attesa",
    createdAt: new Date(Date.now() - 300000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: uid(),
    table: "8",
    covers: 6,
    area: "sala",
    waiter: "Marco",
    notes: "Compleanno - portare torta al dessert",
    items: [
      { id: "i10", name: "Tagliere toscano", qty: 2, category: "antipasti", area: "cucina", price: 14, note: null, course: 1 },
      { id: "i11", name: "Risotto ai funghi", qty: 3, category: "primi", area: "cucina", price: 13, note: null, course: 2 },
      { id: "i12", name: "Griglia mista", qty: 4, category: "secondi", area: "cucina", price: 22, note: null, course: 3 },
      { id: "i13", name: "Aperol Spritz", qty: 4, category: "cocktail", area: "bar", price: 7, note: null, course: 1 },
      { id: "i14", name: "Tiramisù", qty: 6, category: "dolci", area: "cucina", price: 7, note: null, course: 4 },
    ],
    activeCourse: 2,
    courseStates: { "1": "servito", "2": "pronto", "3": "queued", "4": "queued" },
    status: "in_attesa",
    createdAt: new Date(Date.now() - 2400000).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: uid(),
    table: "12",
    covers: 2,
    area: "sala",
    waiter: "Laura",
    notes: "",
    items: [
      { id: "i15", name: "Caprese", qty: 2, category: "antipasti", area: "cucina", price: 9, note: null, course: 1 },
      { id: "i16", name: "Cacio e pepe", qty: 2, category: "primi", area: "cucina", price: 11, note: null, course: 2 },
    ],
    activeCourse: 1,
    courseStates: { "1": "pronto", "2": "queued" },
    status: "in_attesa",
    createdAt: new Date(Date.now() - 1200000).toISOString(),
    updatedAt: new Date(Date.now() - 60000).toISOString(),
  },
];
