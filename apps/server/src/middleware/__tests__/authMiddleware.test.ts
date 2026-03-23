import { SocketEvents } from "@codeshare/shared";
import type { Socket } from "socket.io";
import { describe, expect, it, vi } from "vitest";
import { createAuthMiddleware } from "../authMiddleware.js";

function mockSocket(overrides: Record<string, unknown> = {}): Socket {
  return {
    id: "sock-1",
    data: { roomCode: "abc-xyz" },
    emit: vi.fn(),
    ...overrides,
  } as unknown as Socket;
}

function mockRoom(overrides: Record<string, unknown> = {}) {
  return {
    mode: "collaboration" as const,
    users: [{ id: "u1", socketId: "sock-1", role: "peer", connected: true }],
    pendingHintRequest: null,
    canExecute: () => ({ allowed: true }),
    canSwitchProblem: () => ({ allowed: true }),
    ...overrides,
  };
}

function mockLogger() {
  return {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  };
}

describe("authMiddleware logging", () => {
  it("logs warn when roomCode is missing", () => {
    const logger = mockLogger();
    const roomLookup = { getRoom: vi.fn() };
    const middleware = createAuthMiddleware(roomLookup, logger as never);
    const socket = mockSocket({ data: {} });
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.CODE_RUN], next);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ socketId: "sock-1", eventName: SocketEvents.CODE_RUN }),
      "Auth middleware: missing roomCode",
    );
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("logs warn when room is not found", () => {
    const logger = mockLogger();
    const roomLookup = { getRoom: vi.fn().mockReturnValue(undefined) };
    const middleware = createAuthMiddleware(roomLookup, logger as never);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.CODE_RUN], next);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        socketId: "sock-1",
        eventName: SocketEvents.CODE_RUN,
        roomCode: "abc-xyz",
      }),
      "Auth middleware: room not found",
    );
  });

  it("logs warn when user is not in room", () => {
    const logger = mockLogger();
    const room = mockRoom({ users: [] });
    const roomLookup = { getRoom: vi.fn().mockReturnValue(room) };
    const middleware = createAuthMiddleware(roomLookup, logger as never);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.CODE_RUN], next);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ socketId: "sock-1", roomCode: "abc-xyz" }),
      "Auth middleware: user not in room",
    );
  });

  it("logs info when interviewer-only event is rejected for candidate", () => {
    const logger = mockLogger();
    const room = mockRoom({
      mode: "interview",
      users: [{ id: "u1", socketId: "sock-1", role: "candidate", connected: true }],
    });
    const roomLookup = { getRoom: vi.fn().mockReturnValue(room) };
    const middleware = createAuthMiddleware(roomLookup, logger as never);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.PROBLEM_SELECT], next);

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        socketId: "sock-1",
        eventName: SocketEvents.PROBLEM_SELECT,
        roomCode: "abc-xyz",
        userId: "u1",
        role: "candidate",
      }),
      "Auth middleware: interviewer-only event rejected",
    );
    expect(socket.emit).toHaveBeenCalledWith(
      SocketEvents.EVENT_REJECTED,
      expect.objectContaining({ event: SocketEvents.PROBLEM_SELECT }),
    );
  });

  it("logs info when hint request is blocked in interview mode", () => {
    const logger = mockLogger();
    const room = mockRoom({
      mode: "interview",
      users: [{ id: "u1", socketId: "sock-1", role: "interviewer", connected: true }],
    });
    const roomLookup = { getRoom: vi.fn().mockReturnValue(room) };
    const middleware = createAuthMiddleware(roomLookup, logger as never);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.HINT_REQUEST], next);

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ socketId: "sock-1", roomCode: "abc-xyz" }),
      "Auth middleware: blocked in interview mode",
    );
  });

  it("works without logger (backward compatible)", () => {
    const room = mockRoom();
    const roomLookup = { getRoom: vi.fn().mockReturnValue(room) };
    const middleware = createAuthMiddleware(roomLookup);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.CODE_RUN], next);

    expect(next).toHaveBeenCalledWith();
  });
});
