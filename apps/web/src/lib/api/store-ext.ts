import { uid } from "./store";

// Generic collection backed by a Map
export class Collection<T extends { id: string }> {
  private data = new Map<string, T>();
  constructor(seed: Omit<T, "id">[] = [], prefix = "item") {
    for (const s of seed) {
      const id = uid(prefix);
      this.data.set(id, { ...s, id } as T);
    }
  }
  all() { return [...this.data.values()]; }
  get(id: string) { return this.data.get(id); }
  set(id: string, item: T) { this.data.set(id, item); }
  delete(id: string) { return this.data.delete(id); }
  size() { return this.data.size; }
  find(fn: (item: T) => boolean) { return this.all().find(fn); }
  filter(fn: (item: T) => boolean) { return this.all().filter(fn); }
}

// ── Staff ──
export type StaffMember = { id: string; name: string; role: string; email: string; phone: string; hireDate: string; salary: number; status: "attivo" | "ferie" | "malattia" | "licenziato"; hoursWeek: number; notes: string };
export const staffCollection = new Collection<StaffMember>([
  { name: "Marco Rossi", role: "Cameriere", email: "marco@ristosaas.it", phone: "+39 333 1234567", hireDate: "2024-03-15", salary: 1600, status: "attivo", hoursWeek: 40, notes: "" },
  { name: "Luigi Bianchi", role: "Chef", email: "luigi@ristosaas.it", phone: "+39 333 2345678", hireDate: "2023-01-10", salary: 2200, status: "attivo", hoursWeek: 44, notes: "Responsabile cucina" },
  { name: "Anna Verdi", role: "Cassiera", email: "anna@ristosaas.it", phone: "+39 333 3456789", hireDate: "2024-06-01", salary: 1500, status: "attivo", hoursWeek: 36, notes: "" },
  { name: "Elena Neri", role: "Supervisor", email: "elena@ristosaas.it", phone: "+39 333 4567890", hireDate: "2022-09-01", salary: 2500, status: "attivo", hoursWeek: 45, notes: "Responsabile sala" },
  { name: "Luca Costa", role: "Magazziniere", email: "luca@ristosaas.it", phone: "+39 333 5678901", hireDate: "2024-01-20", salary: 1400, status: "attivo", hoursWeek: 40, notes: "" },
  { name: "Sofia Russo", role: "Barista", email: "sofia@ristosaas.it", phone: "+39 333 6789012", hireDate: "2024-08-01", salary: 1500, status: "ferie", hoursWeek: 38, notes: "In ferie fino al 20/04" },
], "stf");

// ── Customers ──
export type Customer = { id: string; name: string; email: string; phone: string; type: "vip" | "habitue" | "walk-in" | "new"; visits: number; totalSpent: number; avgSpend: number; allergies: string; preferences: string; notes: string; lastVisit: string };
export const customersCollection = new Collection<Customer>([
  { name: "Roberto Marchetti", email: "roberto@email.it", phone: "+39 338 1111111", type: "vip", visits: 87, totalSpent: 4350, avgSpend: 50, allergies: "Glutine", preferences: "Tavolo 4, vino rosso", notes: "Cliente storico", lastVisit: "2026-04-10" },
  { name: "Giulia Ferrari", email: "giulia@email.it", phone: "+39 338 2222222", type: "habitue", visits: 34, totalSpent: 1700, avgSpend: 50, allergies: "", preferences: "Vegetariana", notes: "", lastVisit: "2026-04-08" },
  { name: "Alessandro Conti", email: "alex@email.it", phone: "+39 338 3333333", type: "habitue", visits: 22, totalSpent: 1540, avgSpend: 70, allergies: "Lattosio", preferences: "Pesce fresco", notes: "Sempre con la moglie", lastVisit: "2026-04-05" },
  { name: "Francesca Moretti", email: "francy@email.it", phone: "+39 338 4444444", type: "vip", visits: 56, totalSpent: 5600, avgSpend: 100, allergies: "", preferences: "Champagne, tavolo privé", notes: "Spesso cene aziendali", lastVisit: "2026-04-09" },
  { name: "Marco Barbieri", email: "mbarbieri@email.it", phone: "+39 338 5555555", type: "walk-in", visits: 3, totalSpent: 120, avgSpend: 40, allergies: "Noci", preferences: "", notes: "", lastVisit: "2026-04-01" },
  { name: "Laura Gentile", email: "laura@email.it", phone: "+39 338 6666666", type: "new", visits: 1, totalSpent: 45, avgSpend: 45, allergies: "", preferences: "", notes: "Prima visita 10/04", lastVisit: "2026-04-10" },
  { name: "Paolo Esposito", email: "paolo@email.it", phone: "+39 338 7777777", type: "habitue", visits: 18, totalSpent: 900, avgSpend: 50, allergies: "Crostacei", preferences: "Pasta fresca", notes: "", lastVisit: "2026-04-07" },
  { name: "Chiara Romano", email: "chiara@email.it", phone: "+39 338 8888888", type: "vip", visits: 42, totalSpent: 4200, avgSpend: 100, allergies: "", preferences: "Terrazza, degustazione", notes: "Influencer food", lastVisit: "2026-04-11" },
], "cst");

// ── Bookings ──
export type Booking = { id: string; customerName: string; phone: string; email: string; date: string; time: string; guests: number; table: string; notes: string; status: "confermata" | "in_attesa" | "annullata" | "completata"; allergies: string };
export const bookingsCollection = new Collection<Booking>([
  { customerName: "Roberto Marchetti", phone: "+39 338 1111111", email: "roberto@email.it", date: "2026-04-12", time: "20:00", guests: 4, table: "4", notes: "Compleanno moglie", status: "confermata", allergies: "Glutine" },
  { customerName: "Giulia Ferrari", phone: "+39 338 2222222", email: "giulia@email.it", date: "2026-04-12", time: "20:30", guests: 2, table: "7", notes: "Menu vegetariano", status: "confermata", allergies: "" },
  { customerName: "Francesca Moretti", phone: "+39 338 4444444", email: "francy@email.it", date: "2026-04-12", time: "21:00", guests: 8, table: "10", notes: "Cena aziendale", status: "in_attesa", allergies: "" },
  { customerName: "Nuovo cliente", phone: "+39 339 9999999", email: "", date: "2026-04-13", time: "13:00", guests: 2, table: "", notes: "", status: "in_attesa", allergies: "" },
], "bk");

// ── Suppliers ──
export type Supplier = { id: string; name: string; category: string; email: string; phone: string; address: string; piva: string; paymentTerms: string; rating: number; notes: string; active: boolean };
export const suppliersCollection = new Collection<Supplier>([
  { name: "Molino Rossi", category: "Secchi", email: "info@molinorossi.it", phone: "+39 02 1111111", address: "Via Milano 15, Milano", piva: "IT01234567890", paymentTerms: "30gg", rating: 5, notes: "Farina premium", active: true },
  { name: "Caseificio Ferrara", category: "Latticini", email: "ordini@caseificioferrara.it", phone: "+39 081 2222222", address: "Via Napoli 42, Napoli", piva: "IT09876543210", paymentTerms: "15gg", rating: 5, notes: "Mozzarella di bufala DOP", active: true },
  { name: "Ortofrutticola Sud", category: "Ortofrutta", email: "ordini@ortosud.it", phone: "+39 089 3333333", address: "Via Salerno 8, Salerno", piva: "IT11223344556", paymentTerms: "7gg", rating: 4, notes: "Consegna giornaliera", active: true },
  { name: "Oleificio Ferrante", category: "Condimenti", email: "info@oleificioferrante.it", phone: "+39 080 4444444", address: "Via Bari 22, Bari", piva: "IT55443322110", paymentTerms: "30gg", rating: 5, notes: "Olio EVO bio", active: true },
  { name: "Cantina dei Colli", category: "Bevande", email: "vendite@cantinacolli.it", phone: "+39 06 5555555", address: "Via Roma 100, Frascati", piva: "IT66778899001", paymentTerms: "60gg", rating: 4, notes: "", active: true },
  { name: "Salumificio Norcia", category: "Salumi", email: "ordini@saluminorcia.it", phone: "+39 0743 666666", address: "Via Norcia 5, Norcia", piva: "IT99887766554", paymentTerms: "30gg", rating: 5, notes: "Guanciale e pecorino", active: true },
], "sup");

// ── Catering Events ──
export type CateringEvent = { id: string; name: string; date: string; guests: number; venue: string; budget: number; status: "preventivo" | "confermato" | "completato" | "annullato"; contact: string; phone: string; menu: string; notes: string; depositPaid: boolean };
export const cateringCollection = new Collection<CateringEvent>([
  { name: "Matrimonio Rossi-Bianchi", date: "2026-05-15", guests: 120, venue: "Villa dei Cedri", budget: 8500, status: "confermato", contact: "Maria Rossi", phone: "+39 333 1112233", menu: "Menu degustazione 5 portate", notes: "Allergie: 2 celiaci, 1 lattosio", depositPaid: true },
  { name: "Evento aziendale TechCorp", date: "2026-04-25", guests: 50, venue: "In sede", budget: 3500, status: "confermato", contact: "Dir. Marketing", phone: "+39 02 9998877", menu: "Buffet standing + cocktail", notes: "Setup ore 17", depositPaid: true },
  { name: "Compleanno 50 anni", date: "2026-06-10", guests: 30, venue: "Sala privata", budget: 2000, status: "preventivo", contact: "Luca Gentile", phone: "+39 333 4445566", menu: "Da definire", notes: "Richiesta torta personalizzata", depositPaid: false },
], "cat");

// ── Asporto Orders ──
export type AsportoOrder = { id: string; customerName: string; phone: string; items: { name: string; qty: number; price: number }[]; total: number; status: "nuovo" | "in_preparazione" | "pronto" | "ritirato" | "consegnato" | "annullato"; pickupTime: string; notes: string; createdAt: string; type: "asporto" | "delivery"; address: string };
export const asportoCollection = new Collection<AsportoOrder>([
  { customerName: "Marco B.", phone: "+39 333 1111111", items: [{ name: "Margherita", qty: 2, price: 8 }, { name: "Diavola", qty: 1, price: 10 }], total: 26, status: "in_preparazione", pickupTime: "19:30", notes: "", createdAt: new Date().toISOString(), type: "asporto", address: "" },
  { customerName: "Anna L.", phone: "+39 333 2222222", items: [{ name: "Carbonara", qty: 2, price: 12 }, { name: "Tiramisù", qty: 2, price: 7 }], total: 38, status: "nuovo", pickupTime: "20:00", notes: "Senza pepe", createdAt: new Date().toISOString(), type: "delivery", address: "Via Roma 15" },
], "asp");

// ── Archivio (historical) ──
export type ArchivedOrder = { id: string; date: string; table: string; waiter: string; items: { name: string; qty: number; price: number }[]; total: number; status: "completato" | "annullato" | "stornato"; paymentMethod: "contanti" | "carta" | "misto"; closedAt: string };
const archDates = ["2026-04-11","2026-04-10","2026-04-09","2026-04-08","2026-04-07","2026-04-06"];
export const archivioCollection = new Collection<ArchivedOrder>([
  { date: archDates[0]!, table: "5", waiter: "Marco", items: [{ name: "Carbonara", qty: 2, price: 12 }, { name: "Tagliata", qty: 1, price: 22 }], total: 46, status: "completato", paymentMethod: "carta", closedAt: `${archDates[0]}T22:15:00Z` },
  { date: archDates[0]!, table: "3", waiter: "Laura", items: [{ name: "Margherita", qty: 2, price: 8 }, { name: "Birra", qty: 2, price: 5 }], total: 26, status: "completato", paymentMethod: "contanti", closedAt: `${archDates[0]}T21:30:00Z` },
  { date: archDates[1]!, table: "8", waiter: "Marco", items: [{ name: "Grigliata mista", qty: 3, price: 18 }, { name: "Vino", qty: 1, price: 25 }], total: 79, status: "completato", paymentMethod: "carta", closedAt: `${archDates[1]}T23:00:00Z` },
  { date: archDates[1]!, table: "1", waiter: "Elena", items: [{ name: "Bruschetta", qty: 2, price: 9 }], total: 18, status: "stornato", paymentMethod: "contanti", closedAt: `${archDates[1]}T20:00:00Z` },
  { date: archDates[2]!, table: "10", waiter: "Laura", items: [{ name: "Risotto funghi", qty: 4, price: 14 }, { name: "Tiramisù", qty: 4, price: 7 }], total: 84, status: "completato", paymentMethod: "misto", closedAt: `${archDates[2]}T22:45:00Z` },
  { date: archDates[3]!, table: "4", waiter: "Marco", items: [{ name: "Diavola", qty: 2, price: 10 }, { name: "Spritz", qty: 2, price: 7 }], total: 34, status: "completato", paymentMethod: "carta", closedAt: `${archDates[3]}T21:00:00Z` },
  { date: archDates[4]!, table: "7", waiter: "Elena", items: [{ name: "Carbonara", qty: 3, price: 12 }], total: 36, status: "completato", paymentMethod: "contanti", closedAt: `${archDates[4]}T22:00:00Z` },
  { date: archDates[5]!, table: "2", waiter: "Laura", items: [{ name: "Caprese", qty: 2, price: 9 }, { name: "Cacio e pepe", qty: 2, price: 11 }], total: 40, status: "completato", paymentMethod: "carta", closedAt: `${archDates[5]}T21:30:00Z` },
], "arc");
