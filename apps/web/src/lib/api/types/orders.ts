export type CourseStatus = "queued" | "in_attesa" | "in_preparazione" | "pronto" | "servito";
export type OrderStatus =
  | "pending"
  | "in_attesa"
  | "in_preparazione"
  | "pronto"
  | "servito"
  | "chiuso"
  | "annullato";
export type OrderArea = "sala" | "cucina" | "bar" | "pizzeria";

/** Pagamento online (Stripe) per ordini da menu pubblico. */
export type OrderOnlinePaymentStatus = "unpaid" | "paid";

export type OrderItem = {
  id: string;
  /** Presente se la riga proviene da una voce menu (es. ordine da menu pubblico). */
  menuItemId?: string | null;
  name: string;
  qty: number;
  category: string | null;
  area: OrderArea;
  price: number | null;
  note: string | null;
  course: number;
};

export type Order = {
  id: string;
  table: string | null;
  covers: number | null;
  area: OrderArea;
  waiter: string;
  notes: string;
  items: OrderItem[];
  activeCourse: number;
  courseStates: Record<string, CourseStatus>;
  status: OrderStatus;
  onlinePaymentStatus: OrderOnlinePaymentStatus;
  stripeCheckoutSessionId: string | null;
  createdAt: string;
  updatedAt: string;
};
