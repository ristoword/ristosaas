export type {
  CourseStatus,
  OrderStatus,
  OrderArea,
  OrderItem,
  Order,
} from "@/lib/api-client";

export type CourseDraft = {
  n: number;
  items: { name: string; qty: number; category: string | null; area: "sala" | "cucina" | "bar" | "pizzeria"; price: number | null; note: string | null }[];
};
