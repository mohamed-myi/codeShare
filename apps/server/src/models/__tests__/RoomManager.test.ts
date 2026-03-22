import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { roomManager } from "../RoomManager.js";

describe("RoomManager", () => {
  const createdRoomCodes: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const code of createdRoomCodes) {
      roomManager.destroyRoom(code);
    }
    createdRoomCodes.length = 0;
    vi.useRealTimers();
  });

  function trackRoom(code: string): void {
    createdRoomCodes.push(code);
  }

  describe("createRoom", () => {
    it("returns a Room with a valid room code in abcd-efgh format", () => {
      const room = roomManager.createRoom("collaboration");
      trackRoom(room.roomCode);
      expect(room.roomCode).toMatch(/^[a-z2-7]{4}-[a-z2-7]{4}$/);
      expect(room.mode).toBe("collaboration");
    });

    it("makes the room retrievable by getRoom", () => {
      const room = roomManager.createRoom("interview");
      trackRoom(room.roomCode);
      expect(roomManager.getRoom(room.roomCode)).toBe(room);
    });

    it("generates unique codes for consecutive rooms", () => {
      const room1 = roomManager.createRoom("collaboration");
      const room2 = roomManager.createRoom("collaboration");
      trackRoom(room1.roomCode);
      trackRoom(room2.roomCode);
      expect(room1.roomCode).not.toBe(room2.roomCode);
    });

    it("increments room count", () => {
      const before = roomManager.getRoomCount();
      const room = roomManager.createRoom("collaboration");
      trackRoom(room.roomCode);
      expect(roomManager.getRoomCount()).toBe(before + 1);
    });
  });

  describe("getRoom", () => {
    it("returns undefined for nonexistent room code", () => {
      expect(roomManager.getRoom("zzzz-zzzz")).toBeUndefined();
    });

    it("normalizes room code (case insensitive, trims whitespace)", () => {
      const room = roomManager.createRoom("collaboration");
      trackRoom(room.roomCode);
      expect(roomManager.getRoom(room.roomCode.toUpperCase())).toBe(room);
      expect(roomManager.getRoom(`  ${room.roomCode}  `)).toBe(room);
    });
  });

  describe("destroyRoom", () => {
    it("removes room from storage", () => {
      const room = roomManager.createRoom("collaboration");
      roomManager.destroyRoom(room.roomCode);
      expect(roomManager.getRoom(room.roomCode)).toBeUndefined();
    });

    it("clears active grace period timers on the destroyed room", () => {
      const room = roomManager.createRoom("collaboration");
      const user = room.addUser("Alice", "peer", "s1");
      const onExpire = vi.fn();
      room.startGracePeriod(user.id, onExpire);

      roomManager.destroyRoom(room.roomCode);
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(onExpire).not.toHaveBeenCalled();
    });

    it("is a no-op for nonexistent room code", () => {
      expect(() => roomManager.destroyRoom("zzzz-zzzz")).not.toThrow();
    });

    it("decrements room count", () => {
      const room = roomManager.createRoom("collaboration");
      const countBefore = roomManager.getRoomCount();
      roomManager.destroyRoom(room.roomCode);
      expect(roomManager.getRoomCount()).toBe(countBefore - 1);
    });
  });

  describe("onDestroy", () => {
    it("fires listener with room code when room is destroyed", () => {
      const listener = vi.fn();
      const unsubscribe = roomManager.onDestroy(listener);
      const room = roomManager.createRoom("collaboration");
      roomManager.destroyRoom(room.roomCode);
      expect(listener).toHaveBeenCalledWith(room.roomCode);
      unsubscribe();
    });

    it("unsubscribe prevents future callbacks", () => {
      const listener = vi.fn();
      const unsubscribe = roomManager.onDestroy(listener);
      unsubscribe();
      const room = roomManager.createRoom("collaboration");
      trackRoom(room.roomCode);
      roomManager.destroyRoom(room.roomCode);
      createdRoomCodes.pop();
      expect(listener).not.toHaveBeenCalled();
    });

    it("supports multiple concurrent listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const unsub1 = roomManager.onDestroy(listener1);
      const unsub2 = roomManager.onDestroy(listener2);
      const room = roomManager.createRoom("collaboration");
      roomManager.destroyRoom(room.roomCode);
      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
      unsub1();
      unsub2();
    });
  });
});
