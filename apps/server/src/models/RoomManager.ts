import type { RoomMode } from "@codeshare/shared";
import { Room } from "./Room.js";
import { generateRoomCode, normalizeRoomCode } from "../lib/roomCode.js";

class RoomManagerSingleton {
  private rooms = new Map<string, Room>();
  private destroyListeners = new Set<(roomCode: string) => void>();

  createRoom(mode: RoomMode): Room {
    const activeCodes = new Set(this.rooms.keys());
    const roomCode = generateRoomCode(activeCodes);
    const room = new Room(roomCode, mode);
    this.rooms.set(roomCode, room);
    return room;
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(normalizeRoomCode(roomCode));
  }

  destroyRoom(roomCode: string): void {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    const room = this.rooms.get(normalizedRoomCode);
    if (!room) return;

    for (const [, timer] of room.gracePeriodTimers) {
      clearTimeout(timer);
    }
    room.gracePeriodTimers.clear();
    for (const listener of this.destroyListeners) {
      listener(normalizedRoomCode);
    }
    this.rooms.delete(normalizedRoomCode);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  onDestroy(listener: (roomCode: string) => void): () => void {
    this.destroyListeners.add(listener);
    return () => {
      this.destroyListeners.delete(listener);
    };
  }
}

export const roomManager = new RoomManagerSingleton();
