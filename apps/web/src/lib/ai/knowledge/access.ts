import type { PublicUser } from "@/lib/auth/types";

const KNOWLEDGE_WRITE_ROLES = ["owner", "supervisor", "super_admin"] as const;
const KNOWLEDGE_READ_ROLES = [
  "owner",
  "supervisor",
  "super_admin",
  "hotel_manager",
  "reception",
  "housekeeping",
  "cucina",
  "sala",
  "bar",
  "pizzeria",
  "magazzino",
  "cassa",
] as const;

export function canReadKnowledge(user: Pick<PublicUser, "role">): boolean {
  return (KNOWLEDGE_READ_ROLES as readonly string[]).includes(user.role);
}

export function canWriteKnowledge(user: Pick<PublicUser, "role">): boolean {
  return (KNOWLEDGE_WRITE_ROLES as readonly string[]).includes(user.role);
}

export function isKnowledgeSuperAdmin(user: Pick<PublicUser, "role">): boolean {
  return user.role === "super_admin";
}
