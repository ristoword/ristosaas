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
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: number | null;
};

export type PublicUser = Omit<StoredUser, "password"> & {
  isLocked: boolean;
};

export const USERS: StoredUser[] = [
  { id: "u1", username: "owner", password: "owner123", name: "Paolo Basile", role: "owner", email: "owner@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u2", username: "sala", password: "sala123", name: "Marco Rossi", role: "sala", email: "sala@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u3", username: "cucina", password: "cucina123", name: "Luigi Bianchi", role: "cucina", email: "cucina@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u4", username: "cassa", password: "cassa123", name: "Anna Verdi", role: "cassa", email: "cassa@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u5", username: "supervisor", password: "super123", name: "Elena Neri", role: "supervisor", email: "supervisor@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u6", username: "magazzino", password: "magazzino123", name: "Luca Costa", role: "magazzino", email: "magazzino@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u8", username: "hotel", password: "hotel123", name: "Giulia Ferri", role: "hotel_manager", email: "hotel@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u9", username: "reception", password: "reception123", name: "Martina Blu", role: "reception", email: "reception@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u10", username: "housekeeping", password: "house123", name: "Davide Serra", role: "housekeeping", email: "housekeeping@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u7", username: "admin", password: "admin", name: "Super Admin Legacy", role: "super_admin", email: "admin@ristosaas.it", mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  { id: "u_superadmin_root", username: "superadmin", password: "Temp#SA2026!", name: "Super Admin Root", role: "super_admin", email: "superadmin@ristosaas.it", mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null },
];

export function sanitizeUser(user: StoredUser): PublicUser {
  const { password: _password, ...safe } = user;
  return {
    ...safe,
    mustChangePassword: !!safe.mustChangePassword,
    failedLoginAttempts: safe.failedLoginAttempts || 0,
    lockedUntil: safe.lockedUntil || null,
    isLocked: isUserLocked(user),
  };
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
  user.mustChangePassword = false;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  return { ok: true as const, user };
}

export function isUserLocked(user: StoredUser) {
  return typeof user.lockedUntil === "number" && user.lockedUntil > Date.now();
}

export function registerFailedLogin(username: string) {
  const user = findUserByUsername(username);
  if (!user) return { found: false as const, locked: false, attempt: 0, lockedSeconds: 0 };

  const attempts = (user.failedLoginAttempts || 0) + 1;
  user.failedLoginAttempts = attempts;
  if (attempts >= 5) user.lockedUntil = Date.now() + 5 * 60 * 1000;
  const lockedSeconds = user.lockedUntil && user.lockedUntil > Date.now() ? Math.ceil((user.lockedUntil - Date.now()) / 1000) : 0;
  return { found: true as const, locked: isUserLocked(user), attempt: attempts, lockedSeconds };
}

export function clearLoginFailures(username: string) {
  const user = findUserByUsername(username);
  if (!user) return;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
}

export function unlockUser(userId: string) {
  const user = findUserById(userId);
  if (!user) return null;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  return sanitizeUser(user);
}

export function generateTemporaryPassword(userId: string) {
  const user = findUserById(userId);
  if (!user) return null;
  const temp = `Temp#${Math.random().toString(36).slice(2, 8)}${Date.now().toString().slice(-2)}`;
  user.password = temp;
  user.mustChangePassword = true;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  return { user: sanitizeUser(user), temporaryPassword: temp };
}

export function listAdminUsers() {
  return USERS.map((user) => sanitizeUser(user));
}
