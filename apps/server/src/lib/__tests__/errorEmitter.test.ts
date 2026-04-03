import { SocketEvents } from "@codeshare/shared";
import { describe, expect, it, vi } from "vitest";
import { emitExecutionError, emitMessageEvent, emitScopedEvent } from "../errorEmitter.js";

function createContext(roomCode?: string) {
  const roomEmit = vi.fn();
  const socketEmit = vi.fn();
  const to = vi.fn().mockReturnValue({ emit: roomEmit });

  return {
    ctx: {
      io: { to },
      socket: { emit: socketEmit },
      roomCode,
    },
    roomEmit,
    socketEmit,
    to,
  };
}

describe("errorEmitter", () => {
  it("emits scoped events to the socket", () => {
    const { ctx, socketEmit, to } = createContext("abc-xyz");

    emitScopedEvent(ctx as never, SocketEvents.HINT_ERROR, { message: "Failed." }, "socket");

    expect(socketEmit).toHaveBeenCalledWith(SocketEvents.HINT_ERROR, { message: "Failed." });
    expect(to).not.toHaveBeenCalled();
  });

  it("emits scoped events to the room", () => {
    const { ctx, roomEmit, socketEmit, to } = createContext("abc-xyz");

    emitScopedEvent(ctx as never, SocketEvents.PROBLEM_IMPORT_STATUS, { status: "saved" }, "room");

    expect(to).toHaveBeenCalledWith("abc-xyz");
    expect(roomEmit).toHaveBeenCalledWith(SocketEvents.PROBLEM_IMPORT_STATUS, {
      status: "saved",
    });
    expect(socketEmit).not.toHaveBeenCalled();
  });

  it("emits message events with the standard message payload", () => {
    const { ctx, socketEmit } = createContext();

    emitMessageEvent(ctx as never, SocketEvents.TESTCASE_ERROR, "Invalid test case payload.");

    expect(socketEmit).toHaveBeenCalledWith(SocketEvents.TESTCASE_ERROR, {
      message: "Invalid test case payload.",
    });
  });

  it("emits execution errors with errorType and message", () => {
    const { ctx, socketEmit } = createContext();

    emitExecutionError(ctx as never, "api_error", "Failed to execute code.", "socket");

    expect(socketEmit).toHaveBeenCalledWith(SocketEvents.EXECUTION_ERROR, {
      errorType: "api_error",
      message: "Failed to execute code.",
    });
  });
});
