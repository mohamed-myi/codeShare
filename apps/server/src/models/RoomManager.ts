import type { RoomMode } from "@codeshare/shared";
import { generateRoomCode, normalizeRoomCode } from "../lib/roomCode.js";
import { Room, type RoomOptions } from "./Room.js";

class RoomManagerSingleton {
  private rooms = new Map<string, Room>();
  private destroyListeners = new Set<(roomCode: string) => void>();
  private roomDefaults: RoomOptions = {};

  createRoom(mode: RoomMode): Room {
    const activeCodes = new Set(this.rooms.keys());
    const roomCode = generateRoomCode(activeCodes);
    const room = new Room(roomCode, mode, this.roomDefaults);
    this.rooms.set(roomCode, room);
    return room;
  }

  configureDefaults(defaults: RoomOptions): void {
    this.roomDefaults = { ...defaults };
  }

  resetDefaults(): void {
    this.roomDefaults = {};
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

  resetRooms(): void {
    const roomCodes = [...this.rooms.keys()];
    for (const roomCode of roomCodes) {
      this.destroyRoom(roomCode);
    }
  }

  onDestroy(listener: (roomCode: string) => void): () => void {
    this.destroyListeners.add(listener);
    return () => {
      this.destroyListeners.delete(listener);
    };
  }
}

export const roomManager = new RoomManagerSingleton();
