import { SocketEvents } from "@codeshare/shared";
import { hrtimeMs } from "./clock.js";
import { getLoadTestLogger } from "./logger.js";
import type { EventResult } from "./socket-client.js";

interface ImportStatus {
  status: string;
  message?: string;
}

interface ExecutionErrorPayload {
  errorType: string;
  message: string;
}

type ExecutionResultPayload = Record<string, unknown>;

interface SocketListenerTarget {
  // biome-ignore lint/suspicious/noExplicitAny: matches Socket.io's listener signature
  on(event: string, listener: (data: any) => void): void;
  // biome-ignore lint/suspicious/noExplicitAny: matches Socket.io's listener signature
  off(event: string, listener: (data: any) => void): void;
}

export interface ExecutionAttemptOutcome {
  started: boolean;
  terminal:
    | {
        type: "result";
        data: ExecutionResultPayload;
        latencyMs: number;
      }
    | {
        type: "error";
        data: ExecutionErrorPayload;
        latencyMs: number;
      };
}

const logger = getLoadTestLogger();

export function waitForExecutionAttemptOutcome(
  socket: SocketListenerTarget,
  timeoutMs = 30_000,
): Promise<ExecutionAttemptOutcome> {
  return new Promise<ExecutionAttemptOutcome>((resolve, reject) => {
    const start = hrtimeMs();
    let started = false;

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off(SocketEvents.EXECUTION_STARTED, handleStarted);
      socket.off(SocketEvents.EXECUTION_RESULT, handleResult);
      socket.off(SocketEvents.EXECUTION_ERROR, handleError);
    };

    const timeout = setTimeout(() => {
      cleanup();
      logger.warn("load_test_execution_wait_failed", {
        timeout_ms: timeoutMs,
      });
      reject(new Error(`Timed out waiting for execution completion after ${timeoutMs}ms`));
    }, timeoutMs);

    const handleStarted = () => {
      started = true;
    };

    const handleResult = (data: ExecutionResultPayload) => {
      cleanup();
      resolve({
        started,
        terminal: {
          type: "result",
          data,
          latencyMs: hrtimeMs() - start,
        },
      });
    };

    const handleError = (data: ExecutionErrorPayload) => {
      cleanup();
      resolve({
        started,
        terminal: {
          type: "error",
          data,
          latencyMs: hrtimeMs() - start,
        },
      });
    };

    socket.on(SocketEvents.EXECUTION_STARTED, handleStarted);
    socket.on(SocketEvents.EXECUTION_RESULT, handleResult);
    socket.on(SocketEvents.EXECUTION_ERROR, handleError);
  });
}

export function waitForImportTerminalStatus(
  socket: SocketListenerTarget,
  timeoutMs = 15_000,
): Promise<EventResult<ImportStatus>> {
  return new Promise<EventResult<ImportStatus>>((resolve, reject) => {
    const start = hrtimeMs();

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off(SocketEvents.PROBLEM_IMPORT_STATUS, handleStatus);
    };

    const timeout = setTimeout(() => {
      cleanup();
      logger.warn("load_test_import_wait_failed", {
        timeout_ms: timeoutMs,
      });
      reject(new Error(`Timed out waiting for import completion after ${timeoutMs}ms`));
    }, timeoutMs);

    const handleStatus = (data: ImportStatus) => {
      if (data.status === "scraping") {
        return;
      }

      cleanup();
      resolve({
        data,
        latencyMs: hrtimeMs() - start,
      });
    };

    socket.on(SocketEvents.PROBLEM_IMPORT_STATUS, handleStatus);
  });
}
