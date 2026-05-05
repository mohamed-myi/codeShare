import type { RoomMode } from "@codeshare/shared";
import { generateRoomCode, normalizeRoomCode } from "../lib/roomCode.js";
import { Room, type RoomOptions } from "./Room.js";

export interface RoomManagerConfig {
  maxActiveRooms?: number;
  idleRoomTtlMs?: number;
}

class RoomManagerSingleton {
  private rooms = new Map<string, Room>();
  private destroyListeners = new Set<(roomCode: string) => void>();
  private roomDefaults: RoomOptions = {};
  private maxActiveRooms = 500;
  private idleRoomTtlMs = 30 * 60 * 1000;

  createRoom(mode: RoomMode): Room {
    if (this.rooms.size >= this.maxActiveRooms) {
      throw new Error("Maximum active rooms limit reached.");
    }
    const activeCodes = new Set(this.rooms.keys());
    const roomCode = generateRoomCode(activeCodes);
    const room = new Room(roomCode, mode, this.roomDefaults);
    this.rooms.set(roomCode, room);
    return room;
  }

  configureDefaults(defaults: RoomOptions & RoomManagerConfig): void {
    this.roomDefaults = { ...defaults };
    if (defaults.maxActiveRooms !== undefined) {
      this.maxActiveRooms = defaults.maxActiveRooms;
    }
    if (defaults.idleRoomTtlMs !== undefined) {
      this.idleRoomTtlMs = defaults.idleRoomTtlMs;
    }
  }

  resetDefaults(): void {
    this.roomDefaults = {};
    this.maxActiveRooms = 500;
    this.idleRoomTtlMs = 30 * 60 * 1000;
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

  getCapacitySnapshot(): { activeRooms: number; maxActiveRooms: number; roomCapacityUsed: number } {
    return {
      activeRooms: this.rooms.size,
      maxActiveRooms: this.maxActiveRooms,
      roomCapacityUsed: this.maxActiveRooms === 0 ? 1 : this.rooms.size / this.maxActiveRooms,
    };
  }

  destroyIdleRooms(idleRoomTtlMs = this.idleRoomTtlMs, now = Date.now()): number {
    let destroyed = 0;
    for (const [roomCode, room] of this.rooms) {
      if (room.connectedUserCount() > 0) {
        continue;
      }
      if (now - room.lastActivityAt.getTime() < idleRoomTtlMs) {
        continue;
      }
      this.destroyRoom(roomCode);
      destroyed += 1;
    }
    return destroyed;
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
