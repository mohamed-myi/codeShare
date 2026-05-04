import {
  CLIENT_LOG_EVENTS,
  type ClientLogPayload,
  clientLogPayloadSchema,
  LOG_SERVICES,
} from "@codeshare/shared";

interface BrowserConsole {
  info: (payload: ClientLogPayload) => void;
  warn: (payload: ClientLogPayload) => void;
  error: (payload: ClientLogPayload) => void;
}

export interface BrowserLogTransport {
  send: (payload: ClientLogPayload) => Promise<void>;
}

interface BrowserLoggerOptions {
  getRoute?: () => string;
  environment?: string;
  route?: string;
  transport?: BrowserLogTransport;
  consoleApi?: BrowserConsole;
}

export interface BrowserLogInput {
  event: string;
  roomCode?: string;
  socketId?: string;
  requestId?: string;
  error?: Error;
  context?: Record<string, unknown>;
}

const DEFAULT_CONSOLE: BrowserConsole = {
  info: (payload) => console.info(payload),
  warn: (payload) => console.warn(payload),
  error: (payload) => console.error(payload),
};

export function createBrowserLogger(options: BrowserLoggerOptions = {}) {
  const environment = options.environment ?? import.meta.env.MODE ?? "development";
  const consoleApi = options.consoleApi ?? DEFAULT_CONSOLE;
  const resolveRoute = () => options.getRoute?.() ?? options.route;

  async function write(level: "info" | "warn" | "error", input: BrowserLogInput): Promise<void> {
    const payload = clientLogPayloadSchema.parse({
      level,
      event: input.event,
      service: LOG_SERVICES.CLIENT,
      timestamp: new Date().toISOString(),
      room_code: input.roomCode,
      socket_id: input.socketId,
      request_id: input.requestId,
      route: resolveRoute(),
      error_type: input.error?.name,
      error_message: input.error?.message,
      context: input.context,
    });

    consoleApi[level](payload);

    if (environment !== "development" || !options.transport) {
      return;
    }

    try {
      await options.transport.send(payload);
    } catch (error) {
      if (isIgnorableTransportFailure(error)) {
        return;
      }

      const fallback = clientLogPayloadSchema.parse({
        level: "error",
        event: CLIENT_LOG_EVENTS.CLIENT_LOG_INGEST_FAILED,
        service: LOG_SERVICES.CLIENT,
        timestamp: new Date().toISOString(),
        route: resolveRoute(),
        error_type: error instanceof Error ? error.name : "UnknownError",
        error_message: error instanceof Error ? error.message : "Client log ingest failed",
        context: {
          original_event: input.event,
        },
      });
      consoleApi.error(fallback);
    }
  }

  return {
    info: (input: BrowserLogInput) => write("info", input),
    warn: (input: BrowserLogInput) => write("warn", input),
    error: (input: BrowserLogInput) => write("error", input),
  };
}

function isIgnorableTransportFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "TypeError" && /failed to fetch|load failed/i.test(error.message);
}

export function createDevLogTransport(): BrowserLogTransport {
  return {
    async send(payload) {
      const response = await fetch("/api/dev/logs/client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Client log ingest failed: ${response.status}`);
      }
    },
  };
}

export function getBrowserLogger(route?: string) {
  return createBrowserLogger({
    environment: import.meta.env.MODE,
    getRoute: route ? undefined : () => window.location.pathname,
    route,
    transport: import.meta.env.DEV ? createDevLogTransport() : undefined,
  });
}
