import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LOG_SERVICES, type LogLevel } from "@codeshare/shared";

export interface LoadTestLoggerOptions {
  environment?: string;
  logDir?: string;
  now?: () => Date;
}

export interface LoadTestLogger {
  info(event: string, context?: Record<string, unknown>): void;
  warn(event: string, context?: Record<string, unknown>): void;
  error(event: string, context?: Record<string, unknown>): void;
}

let sharedLogger: LoadTestLogger | null = null;
const ensuredDirs = new Set<string>();

export function createLoadTestLogEntry(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {},
  options: LoadTestLoggerOptions = {},
): Record<string, unknown> {
  const now = options.now?.() ?? new Date();

  return {
    timestamp: now.toISOString(),
    level,
    event,
    service: LOG_SERVICES.LOAD_TESTS,
    environment: options.environment ?? process.env.NODE_ENV ?? "development",
    ...sanitizeRecord(context),
  };
}

export function createLoadTestLogger(options: LoadTestLoggerOptions = {}): LoadTestLogger {
  return {
    info: (event, context) => writeLoadTestLog("info", event, context, options),
    warn: (event, context) => writeLoadTestLog("warn", event, context, options),
    error: (event, context) => writeLoadTestLog("error", event, context, options),
  };
}

export function getLoadTestLogger(): LoadTestLogger {
  if (!sharedLogger) {
    sharedLogger = createLoadTestLogger();
  }

  return sharedLogger;
}

function writeLoadTestLog(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {},
  options: LoadTestLoggerOptions,
): void {
  const entry = createLoadTestLogEntry(level, event, context, options);
  const logDir = options.logDir ?? defaultLogDir();
  if (!ensuredDirs.has(logDir)) {
    mkdirSync(logDir, { recursive: true });
    ensuredDirs.add(logDir);
  }
  appendFileSync(
    resolve(logDir, `${String(entry.timestamp).slice(0, 10)}.jsonl`),
    `${JSON.stringify(entry)}\n`,
    "utf-8",
  );
}

function defaultLogDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), "..", "..", "..", "logs", LOG_SERVICES.LOAD_TESTS);
}

function sanitizeRecord(context: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, sanitizeValue(value)]),
  );
}

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (value && typeof value === "object") {
    return sanitizeRecord(value as Record<string, unknown>);
  }
  return value;
}
