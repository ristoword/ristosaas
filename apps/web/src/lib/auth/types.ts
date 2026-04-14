export type UserRole =
  | "owner"
  | "sala"
  | "cucina"
  | "cassa"
  | "supervisor"
  | "magazzino"
  | "staff"
  | "bar"
  | "pizzeria"
  | "hotel_manager"
  | "reception"
  | "housekeeping"
  | "super_admin";

export type PublicUser = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: number | null;
  isLocked?: boolean;
};
