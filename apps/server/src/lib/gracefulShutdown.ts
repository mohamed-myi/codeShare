import type http from "node:http";
import type { Logger } from "pino";
import type { Server as SocketIOServer } from "socket.io";
import type { WebSocketServer } from "ws";

export interface ShutdownDeps {
  httpServer: http.Server;
  io: SocketIOServer;
  wss: WebSocketServer;
  logger: Logger;
  destroyAllDocs: () => void;
  resetRooms: () => void;
  closePool: () => Promise<void>;
  forceTimeoutMs?: number;
}

export interface GracefulShutdownResult {
  shutdown: () => Promise<void>;
  isShuttingDown: () => boolean;
}

export function createGracefulShutdown(deps: ShutdownDeps): GracefulShutdownResult {
  const forceTimeoutMs = deps.forceTimeoutMs ?? 10_000;
  let shuttingDown = false;
  let shutdownPromise: Promise<void> | null = null;

  async function shutdown(): Promise<void> {
    if (shuttingDown) {
      return shutdownPromise ?? Promise.resolve();
    }
    shuttingDown = true;

    shutdownPromise = executeShutdown();
    return shutdownPromise;
  }

  async function executeShutdown(): Promise<void> {
    deps.logger.info({ event: "graceful_shutdown_started" });

    const forceTimer = setTimeout(() => {
      deps.logger.error({ event: "graceful_shutdown_force_exit" });
      process.exit(1);
    }, forceTimeoutMs);
    if (typeof forceTimer.unref === "function") {
      forceTimer.unref();
    }

    await safeStep(
      "httpServer.close",
      () =>
        new Promise<void>((resolve) => {
          deps.httpServer.close(() => resolve());
        }),
    );

    await safeStep(
      "io.close",
      () =>
        new Promise<void>((resolve) => {
          deps.io.close(() => resolve());
        }),
    );

    await safeStep(
      "wss.close",
      () =>
        new Promise<void>((resolve) => {
          deps.wss.close(() => resolve());
        }),
    );

    await safeStep("destroyAllDocs", () => {
      deps.destroyAllDocs();
      return Promise.resolve();
    });

    await safeStep("resetRooms", () => {
      deps.resetRooms();
      return Promise.resolve();
    });

    await safeStep("closePool", () => deps.closePool());

    clearTimeout(forceTimer);
    deps.logger.info({ event: "graceful_shutdown_complete" });
  }

  async function safeStep(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      deps.logger.error(
        { event: "graceful_shutdown_step_failed", step: name, err: error },
        `Shutdown step "${name}" failed`,
      );
    }
  }

  return {
    shutdown,
    isShuttingDown: () => shuttingDown,
  };
}

export function registerProcessErrorHandlers(logger: Logger, shutdown: () => Promise<void>): void {
  process.on("uncaughtException", (error: Error) => {
    logger.fatal({ event: "uncaught_exception", err: error });
    shutdown().finally(() => process.exit(1));
  });

  process.on("unhandledRejection", (reason: unknown) => {
    logger.fatal({ event: "unhandled_rejection", err: reason });
    shutdown().finally(() => process.exit(1));
  });
}
