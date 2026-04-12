import { USERS } from "@/lib/auth/users.store";

export const usersStore = {
  all: () => USERS,
  getById: (id: string) => USERS.find((user) => user.id === id),
  getByUsername: (username: string) => USERS.find((user) => user.username === username),
};
