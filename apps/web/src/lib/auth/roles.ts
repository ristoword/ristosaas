// Ruoli disponibili nel sistema per la gestione dei turni
export const SHIFT_ROLES = ["cucina", "pizzeria", "bar", "sala", "supervisor", "owner", "superadmin"] as const;
export type ShiftRole = typeof SHIFT_ROLES[number];

// Tutti i ruoli disponibili nel sistema
export const ALL_ROLES = ["cucina", "pizzeria", "bar", "sala", "supervisor", "owner", "superadmin", "admin"] as const;
export type UserRole = typeof ALL_ROLES[number];
