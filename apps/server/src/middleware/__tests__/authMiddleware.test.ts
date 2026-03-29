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
      expect.objectContaining({
        event: "socket_event_rejected",
        socket_id: "sock-1",
        event_name: SocketEvents.CODE_RUN,
        reason: "missing_room_code",
      }),
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
        event: "socket_event_rejected",
        socket_id: "sock-1",
        event_name: SocketEvents.CODE_RUN,
        room_code_hash: expect.any(String),
        reason: "room_not_found",
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
      expect.objectContaining({
        event: "socket_event_rejected",
        socket_id: "sock-1",
        event_name: SocketEvents.CODE_RUN,
        room_code_hash: expect.any(String),
        reason: "user_not_in_room",
      }),
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
        event: "socket_event_rejected",
        socket_id: "sock-1",
        event_name: SocketEvents.PROBLEM_SELECT,
        room_code_hash: expect.any(String),
        user_id: "u1",
        role: "candidate",
        reason: "interviewer_only_event",
      }),
      "Auth middleware: interviewer-only event rejected",
    );
    expect(socket.emit).toHaveBeenCalledWith(
      SocketEvents.EVENT_REJECTED,
      expect.objectContaining({ event: SocketEvents.PROBLEM_SELECT }),
    );
    expect(next).not.toHaveBeenCalled();
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
      expect.objectContaining({
        event: "socket_event_rejected",
        socket_id: "sock-1",
        event_name: SocketEvents.HINT_REQUEST,
        room_code_hash: expect.any(String),
        reason: "blocked_in_interview_mode",
      }),
      "Auth middleware: blocked in interview mode",
    );
    expect(next).not.toHaveBeenCalled();
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

  it("does not call next when execution is rejected by room state", () => {
    const room = mockRoom({
      canExecute: () => ({ allowed: false, reason: "Execution already in progress." }),
    });
    const roomLookup = { getRoom: vi.fn().mockReturnValue(room) };
    const middleware = createAuthMiddleware(roomLookup);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.CODE_RUN], next);

    expect(socket.emit).toHaveBeenCalledWith(SocketEvents.EVENT_REJECTED, {
      event: SocketEvents.CODE_RUN,
      reason: "Execution already in progress.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("does not call next when problem switching is rejected by room state", () => {
    const room = mockRoom({
      canSwitchProblem: () => ({
        allowed: false,
        reason: "Cannot switch problems while code is running.",
      }),
    });
    const roomLookup = { getRoom: vi.fn().mockReturnValue(room) };
    const middleware = createAuthMiddleware(roomLookup);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.PROBLEM_IMPORT], next);

    expect(socket.emit).toHaveBeenCalledWith(SocketEvents.EVENT_REJECTED, {
      event: SocketEvents.PROBLEM_IMPORT,
      reason: "Cannot switch problems while code is running.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next for an allowed guarded event", () => {
    const room = mockRoom();
    const roomLookup = { getRoom: vi.fn().mockReturnValue(room) };
    const middleware = createAuthMiddleware(roomLookup);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.CODE_RUN], next);

    expect(socket.emit).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });
});

describe("authMiddleware requestId", () => {
  it("assigns UUID requestId to socket.data on every event", () => {
    const room = mockRoom();
    const roomLookup = { getRoom: vi.fn().mockReturnValue(room) };
    const middleware = createAuthMiddleware(roomLookup);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.CODE_RUN], next);

    expect(socket.data.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("assigns requestId for bypass events (USER_JOIN)", () => {
    const roomLookup = { getRoom: vi.fn() };
    const middleware = createAuthMiddleware(roomLookup);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.USER_JOIN], next);

    expect(socket.data.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("each event gets a unique requestId", () => {
    const room = mockRoom();
    const roomLookup = { getRoom: vi.fn().mockReturnValue(room) };
    const middleware = createAuthMiddleware(roomLookup);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.CODE_RUN], next);
    const firstId = socket.data.requestId;

    perEventFn([SocketEvents.CODE_RUN], next);
    const secondId = socket.data.requestId;

    expect(firstId).not.toBe(secondId);
  });

  it("requestId appears in rejection log entries", () => {
    const logger = mockLogger();
    const roomLookup = { getRoom: vi.fn().mockReturnValue(undefined) };
    const middleware = createAuthMiddleware(roomLookup, logger as never);
    const socket = mockSocket();
    const next = vi.fn();

    const perEventFn = middleware(socket);
    perEventFn([SocketEvents.CODE_RUN], next);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
      }),
      expect.any(String),
    );
  });
});
