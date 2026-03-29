import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { LOG_SERVICES } from "@codeshare/shared";
import pino from "pino";

const require = createRequire(import.meta.url);
const REDACTED = "[REDACTED]";
const DEFAULT_LOG_DIR = "logs";

const REDACTION_PATHS = [
  "authorization",
  "headers.authorization",
  "headers.cookie",
  "headers.set-cookie",
  "headers.x-rapidapi-key",
  "cookie",
  "set-cookie",
  "apiKey",
  "api_key",
  "token",
  "reconnectToken",
  "reconnect_token",
  "yjsToken",
  "yjs_token",
  "sourceCode",
  "source_code",
  "prompt",
];

export interface CreateLoggerOptions {
  environment?: string;
  service?: string;
  stream?: pino.DestinationStream;
  logDir?: string;
  enablePretty?: boolean;
  enableFileLogging?: boolean;
}

export interface BootstrapLogContext {
  environment?: string;
  event: string;
  level: "error" | "warn" | "info";
  [key: string]: unknown;
}

export function createLogger(level: string, options: CreateLoggerOptions = {}): pino.Logger {
  const environment = options.environment ?? process.env.NODE_ENV ?? "development";
  const service = options.service ?? LOG_SERVICES.SERVER;
  const destination = buildDestination(environment, service, options);

  return pino(
    {
      level,
      base: {
        service,
        environment,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: REDACTION_PATHS,
        censor: REDACTED,
      },
    },
    destination,
  );
}

export function buildBootstrapLogEntry(context: BootstrapLogContext): Record<string, unknown> {
  const environment = context.environment ?? process.env.NODE_ENV ?? "development";
  const { level, ...rest } = context;
  return {
    timestamp: new Date().toISOString(),
    ...rest,
    level,
    service: LOG_SERVICES.SERVER,
    environment,
  };
}

export function writeBootstrapLog(context: BootstrapLogContext): void {
  process.stderr.write(`${JSON.stringify(buildBootstrapLogEntry(context))}\n`);
}

export function roomCodeLogFields(
  roomCode: string | null | undefined,
  environment = process.env.NODE_ENV ?? "development",
): Record<string, string> {
  if (!roomCode) {
    return {};
  }

  if (environment === "development") {
    return { room_code: roomCode };
  }

  return {
    room_code_hash: crypto.createHash("sha256").update(roomCode).digest("hex").slice(0, 16),
  };
}

export function requestIdLogField(socket: {
  data: Record<string, unknown>;
}): Record<string, string> {
  const id = socket.data.requestId;
  return typeof id === "string" ? { request_id: id } : {};
}

function buildDestination(
  environment: string,
  service: string,
  options: CreateLoggerOptions,
): pino.DestinationStream {
  if (options.stream) {
    return options.stream;
  }

  const streams: pino.StreamEntry[] = [];
  const enablePretty = options.enablePretty ?? environment === "development";
  const enableFileLogging = options.enableFileLogging ?? environment === "development";

  if (enablePretty) {
    const prettyStream = resolvePrettyStream();
    if (prettyStream) {
      streams.push({ stream: prettyStream });
    }
  }

  if (enableFileLogging) {
    streams.push({
      stream: pino.destination({
        dest: resolveDailyLogPath(service, options.logDir ?? DEFAULT_LOG_DIR),
        mkdir: true,
        sync: false,
      }),
    });
  }

  if (streams.length === 0) {
    streams.push({ stream: pino.destination(1) });
  }

  return pino.multistream(streams);
}

function resolvePrettyStream(): NodeJS.WritableStream | null {
  try {
    const createPretty = require("pino-pretty") as (
      options: Record<string, unknown>,
    ) => NodeJS.WritableStream;
    return createPretty({
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    });
  } catch {
    return null;
  }
}

function resolveDailyLogPath(service: string, logDir: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const serviceDir = path.join(logDir, service);
  fs.mkdirSync(serviceDir, { recursive: true });
  return path.join(serviceDir, `${date}.jsonl`);
}
