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

export type StoredUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  email: string;
};

export type PublicUser = Omit<StoredUser, "password">;

export const USERS: StoredUser[] = [
  { id: "u1", username: "owner", password: "owner123", name: "Paolo Basile", role: "owner", email: "owner@ristosaas.it" },
  { id: "u2", username: "sala", password: "sala123", name: "Marco Rossi", role: "sala", email: "sala@ristosaas.it" },
  { id: "u3", username: "cucina", password: "cucina123", name: "Luigi Bianchi", role: "cucina", email: "cucina@ristosaas.it" },
  { id: "u4", username: "cassa", password: "cassa123", name: "Anna Verdi", role: "cassa", email: "cassa@ristosaas.it" },
  { id: "u5", username: "supervisor", password: "super123", name: "Elena Neri", role: "supervisor", email: "supervisor@ristosaas.it" },
  { id: "u6", username: "magazzino", password: "magazzino123", name: "Luca Costa", role: "magazzino", email: "magazzino@ristosaas.it" },
  { id: "u8", username: "hotel", password: "hotel123", name: "Giulia Ferri", role: "hotel_manager", email: "hotel@ristosaas.it" },
  { id: "u9", username: "reception", password: "reception123", name: "Martina Blu", role: "reception", email: "reception@ristosaas.it" },
  { id: "u10", username: "housekeeping", password: "house123", name: "Davide Serra", role: "housekeeping", email: "housekeeping@ristosaas.it" },
  { id: "u7", username: "admin", password: "admin", name: "Super Admin", role: "super_admin", email: "admin@ristosaas.it" },
];

export function sanitizeUser(user: StoredUser): PublicUser {
  const { password: _password, ...safe } = user;
  return safe;
}

export function findUserById(id: string) {
  return USERS.find((user) => user.id === id);
}

export function findUserByUsername(username: string) {
  return USERS.find((user) => user.username === username);
}

export function validateUserCredentials(username: string, password: string) {
  const user = findUserByUsername(username);
  if (!user || user.password !== password) return null;
  return user;
}

export function changeUserPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = findUserById(userId);
  if (!user) return { ok: false as const, reason: "not_found" as const };
  if (user.password !== currentPassword) return { ok: false as const, reason: "wrong_password" as const };
  user.password = newPassword;
  return { ok: true as const, user };
}
