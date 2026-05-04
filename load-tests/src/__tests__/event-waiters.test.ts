import { EventEmitter } from "node:events";
import { SocketEvents } from "@codeshare/shared";
import { describe, expect, it } from "vitest";
import {
  waitForExecutionAttemptOutcome,
  waitForImportTerminalStatus,
} from "../lib/event-waiters.js";

class TestSocket extends EventEmitter {}

describe("waitForExecutionAttemptOutcome", () => {
  it("classifies a global limit error without a started event", async () => {
    const socket = new TestSocket();
    const outcomePromise = waitForExecutionAttemptOutcome(socket, 1_000);

    socket.emit(SocketEvents.EXECUTION_ERROR, {
      errorType: "global_limit",
      message: "Daily cap reached.",
    });

    await expect(outcomePromise).resolves.toMatchObject({
      started: false,
      terminal: {
        type: "error",
        data: {
          errorType: "global_limit",
        },
      },
    });
  });

  it("tracks when execution starts before completing", async () => {
    const socket = new TestSocket();
    const outcomePromise = waitForExecutionAttemptOutcome(socket, 1_000);

    socket.emit(SocketEvents.EXECUTION_STARTED, {});
    socket.emit(SocketEvents.EXECUTION_RESULT, {
      success: true,
    });

    await expect(outcomePromise).resolves.toMatchObject({
      started: true,
      terminal: {
        type: "result",
        data: {
          success: true,
        },
      },
    });
  });
});

describe("waitForImportTerminalStatus", () => {
  it("ignores scraping and resolves from the terminal saved status", async () => {
    const socket = new TestSocket();
    const statusPromise = waitForImportTerminalStatus(socket, 1_000);

    socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, { status: "scraping" });
    socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, { status: "saved" });

    await expect(statusPromise).resolves.toMatchObject({
      data: {
        status: "saved",
      },
    });
  });

  it("returns a terminal failure that follows scraping immediately", async () => {
    const socket = new TestSocket();
    const statusPromise = waitForImportTerminalStatus(socket, 1_000);

    socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, { status: "scraping" });
    socket.emit(SocketEvents.PROBLEM_IMPORT_STATUS, {
      status: "failed",
      message: "Daily import limit reached.",
    });

    await expect(statusPromise).resolves.toMatchObject({
      data: {
        status: "failed",
        message: "Daily import limit reached.",
      },
    });
  });
});
