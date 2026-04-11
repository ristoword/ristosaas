export type CourseStatus = "queued" | "in_attesa" | "in_preparazione" | "pronto" | "servito";
export type OrderStatus = "in_attesa" | "in_preparazione" | "pronto" | "servito" | "chiuso" | "annullato";
export type OrderArea = "sala" | "cucina" | "bar" | "pizzeria";

export type OrderItem = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type CourseDraft = {
  n: number;
  items: { name: string; qty: number; category: string | null; area: OrderArea; price: number | null; note: string | null }[];
};
