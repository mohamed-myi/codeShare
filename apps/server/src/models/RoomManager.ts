import type { RoomMode } from "@codeshare/shared";
import { Room } from "./Room.js";
import { generateRoomCode } from "../lib/roomCode.js";

class RoomManagerSingleton {
  private rooms = new Map<string, Room>();

  createRoom(mode: RoomMode): Room {
    const activeCodes = new Set(this.rooms.keys());
    const roomCode = generateRoomCode(activeCodes);
    const room = new Room(roomCode, mode);
    this.rooms.set(roomCode, room);
    return room;
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode.toLowerCase());
  }

  destroyRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    for (const [, timer] of room.gracePeriodTimers) {
      clearTimeout(timer);
    }
    room.gracePeriodTimers.clear();
    this.rooms.delete(roomCode);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }
}

export const roomManager = new RoomManagerSingleton();
