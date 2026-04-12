import type { Room } from "@/lib/api/types/rooms";

const rooms = new Map<string, Room>();

rooms.set("room1", { id: "room1", name: "Sala Principale", tables: 10 });

export const roomsStore = {
  all: () => [...rooms.values()],
  get: (id: string) => rooms.get(id),
  set: (id: string, room: Room) => rooms.set(id, room),
};
