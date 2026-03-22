import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Room } from "../Room.js";

describe("Room", () => {
  let room: Room;

  beforeEach(() => {
    vi.useFakeTimers();
    room = new Room("abc-xyz", "collaboration");
  });

  afterEach(() => {
    for (const [, timer] of room.gracePeriodTimers) {
      clearTimeout(timer);
    }
    vi.useRealTimers();
  });

  describe("addUser", () => {
    it("assigns id, displayName, role, connected, reconnectToken, socketId", () => {
      const user = room.addUser("Alice", "peer", "socket-1");

      expect(user.id).toBeDefined();
      expect(user.displayName).toBe("Alice");
      expect(user.role).toBe("peer");
      expect(user.connected).toBe(true);
      expect(user.reconnectToken).toBeDefined();
      expect(typeof user.reconnectToken).toBe("string");
      expect(user.reconnectToken.length).toBeGreaterThan(0);
      expect(user.socketId).toBe("socket-1");
    });

    it("increments user count and isFull returns true at 2", () => {
      expect(room.isFull()).toBe(false);
      room.addUser("Alice", "peer", "s1");
      expect(room.isFull()).toBe(false);
      room.addUser("Bob", "peer", "s2");
      expect(room.isFull()).toBe(true);
    });

    it("generates distinct ids and reconnect tokens for each user", () => {
      const alice = room.addUser("Alice", "peer", "s1");
      const bob = room.addUser("Bob", "peer", "s2");
      expect(alice.id).not.toBe(bob.id);
      expect(alice.reconnectToken).not.toBe(bob.reconnectToken);
    });
  });

  describe("removeUser", () => {
    it("removes user by id", () => {
      const user = room.addUser("Alice", "peer", "s1");
      expect(room.users).toHaveLength(1);
      room.removeUser(user.id);
      expect(room.users).toHaveLength(0);
    });

    it("clears grace timer for removed user", () => {
      const user = room.addUser("Alice", "peer", "s1");
      room.startGracePeriod(user.id, vi.fn());
      expect(room.gracePeriodTimers.has(user.id)).toBe(true);

      room.removeUser(user.id);
      expect(room.gracePeriodTimers.has(user.id)).toBe(false);
    });
  });

  describe("reconnectUser", () => {
    it("sets connected=true, assigns new socketId, issues new token, cancels grace timer", () => {
      const user = room.addUser("Alice", "peer", "s1");
      const oldToken = user.reconnectToken;

      user.connected = false;
      user.socketId = null;
      room.startGracePeriod(user.id, vi.fn());

      const reconnected = room.reconnectUser(user.id, "s2");

      expect(reconnected).not.toBeNull();
      expect(reconnected?.connected).toBe(true);
      expect(reconnected?.socketId).toBe("s2");
      expect(reconnected?.reconnectToken).not.toBe(oldToken);
      expect(room.gracePeriodTimers.has(user.id)).toBe(false);
    });

    it("returns null for unknown userId", () => {
      const result = room.reconnectUser("nonexistent", "s1");
      expect(result).toBeNull();
    });
  });

  describe("findByReconnectToken", () => {
    it("returns disconnected user matching token", () => {
      const user = room.addUser("Alice", "peer", "s1");
      user.connected = false;

      const found = room.findByReconnectToken(user.reconnectToken);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(user.id);
    });

    it("returns null for connected user (token exists but user is not disconnected)", () => {
      const user = room.addUser("Alice", "peer", "s1");
      expect(user.connected).toBe(true);

      const found = room.findByReconnectToken(user.reconnectToken);
      expect(found).toBeNull();
    });

    it("returns null for bogus token", () => {
      room.addUser("Alice", "peer", "s1");
      const found = room.findByReconnectToken("bogus-token");
      expect(found).toBeNull();
    });
  });

  describe("gracePeriod", () => {
    it("startGracePeriod callback fires after 5 minutes", () => {
      const user = room.addUser("Alice", "peer", "s1");
      const onExpire = vi.fn();

      room.startGracePeriod(user.id, onExpire);
      expect(onExpire).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it("cancelGracePeriod prevents callback from firing", () => {
      const user = room.addUser("Alice", "peer", "s1");
      const onExpire = vi.fn();

      room.startGracePeriod(user.id, onExpire);
      room.cancelGracePeriod(user.id);

      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(onExpire).not.toHaveBeenCalled();
      expect(room.gracePeriodTimers.has(user.id)).toBe(false);
    });

    it("cancelGracePeriod is safe to call when no timer exists", () => {
      expect(() => room.cancelGracePeriod("nonexistent")).not.toThrow();
    });
  });

  describe("canExecute", () => {
    it("blocks when no problem is selected", () => {
      expect(room.problemId).toBeNull();
      const result = room.canExecute();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Select a problem");
    });

    it("blocks when executionInProgress is true", () => {
      room.problemId = "p1";
      room.executionInProgress = true;
      const result = room.canExecute();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("blocks when submissionsUsed >= submissionLimit", () => {
      room.problemId = "p1";
      room.submissionsUsed = room.submissionLimit;
      const result = room.canExecute();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("allows when problem selected, not executing, and within limits", () => {
      room.problemId = "p1";
      const result = room.canExecute();
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("allows when submissionsUsed is one below submissionLimit", () => {
      room.problemId = "p1";
      room.submissionsUsed = room.submissionLimit - 1;
      const result = room.canExecute();
      expect(result.allowed).toBe(true);
    });
  });

  describe("canSwitchProblem", () => {
    it("blocks during execution", () => {
      room.executionInProgress = true;
      const result = room.canSwitchProblem();
      expect(result.allowed).toBe(false);
    });

    it("blocks during hint streaming", () => {
      room.hintStreaming = true;
      const result = room.canSwitchProblem();
      expect(result.allowed).toBe(false);
    });

    it("allows when idle", () => {
      const result = room.canSwitchProblem();
      expect(result.allowed).toBe(true);
    });
  });

  describe("switchProblem", () => {
    it("resets hintsUsed, pendingHintRequest, customTestCases", () => {
      room.hintsUsed = 3;
      room.pendingHintRequest = { requestedBy: "u1", requestedAt: new Date().toISOString() };
      room.customTestCases = [{ input: { n: 1 }, expectedOutput: 1 }];

      room.switchProblem("problem-1", 5);

      expect(room.problemId).toBe("problem-1");
      expect(room.hintLimit).toBe(5);
      expect(room.hintsUsed).toBe(0);
      expect(room.pendingHintRequest).toBeNull();
      expect(room.customTestCases).toEqual([]);
      expect(room.hintHistory).toEqual([]);
    });
  });

  describe("toSyncPayload", () => {
    it("strips reconnectToken and socketId from users", () => {
      room.addUser("Alice", "peer", "s1");
      const payload = room.toSyncPayload();

      expect(payload.users).toHaveLength(1);
      const user = payload.users[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("displayName", "Alice");
      expect(user).toHaveProperty("role", "peer");
      expect(user).toHaveProperty("connected", true);
      expect(user).not.toHaveProperty("reconnectToken");
      expect(user).not.toHaveProperty("socketId");
    });

    it("includes all room state fields", () => {
      const payload = room.toSyncPayload();
      expect(payload.roomCode).toBe("abc-xyz");
      expect(payload.mode).toBe("collaboration");
      expect(payload.maxUsers).toBe(2);
      expect(payload.language).toBe("python");
      expect(payload.executionInProgress).toBe(false);
      expect(payload.createdAt).toBeDefined();
      expect(payload.lastActivityAt).toBeDefined();
    });
  });

  describe("connectedUserCount", () => {
    it("counts only connected users", () => {
      const alice = room.addUser("Alice", "peer", "s1");
      room.addUser("Bob", "peer", "s2");

      expect(room.connectedUserCount()).toBe(2);

      alice.connected = false;
      expect(room.connectedUserCount()).toBe(1);
    });
  });

  describe("findBySocketId", () => {
    it("returns the connected user matching socketId", () => {
      const alice = room.addUser("Alice", "peer", "s1");
      const found = room.findBySocketId("s1");
      expect(found).not.toBeNull();
      expect(found?.id).toBe(alice.id);
    });

    it("returns null when user is disconnected", () => {
      const alice = room.addUser("Alice", "peer", "s1");
      alice.connected = false;
      expect(room.findBySocketId("s1")).toBeNull();
    });

    it("returns null for unknown socketId", () => {
      room.addUser("Alice", "peer", "s1");
      expect(room.findBySocketId("unknown")).toBeNull();
    });
  });

  describe("occupiedUserCount", () => {
    it("counts all users including disconnected", () => {
      const alice = room.addUser("Alice", "peer", "s1");
      room.addUser("Bob", "peer", "s2");
      alice.connected = false;
      expect(room.occupiedUserCount()).toBe(2);
    });
  });
});
