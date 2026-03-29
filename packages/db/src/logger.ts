import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LOG_SERVICES, type LogLevel } from "@codeshare/shared";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEYS = new Set([
  "api_key",
  "apikey",
  "authorization",
  "cookie",
  "private_key",
  "reconnecttoken",
  "reconnect_token",
  "set-cookie",
  "token",
  "yjstoken",
  "yjs_token",
]);

export interface DbLoggerOptions {
  environment?: string;
  logDir?: string;
  now?: () => Date;
  writeToConsole?: boolean;
}

export interface DbLogger {
  info(event: string, context?: Record<string, unknown>): void;
  warn(event: string, context?: Record<string, unknown>): void;
  error(event: string, context?: Record<string, unknown>): void;
}

export function createDbLogEntry(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {},
  options: DbLoggerOptions = {},
): Record<string, unknown> {
  const now = options.now?.() ?? new Date();

  return {
    timestamp: now.toISOString(),
    level,
    event,
    service: LOG_SERVICES.DB,
    environment: options.environment ?? process.env.NODE_ENV ?? "development",
    ...sanitizeRecord(context),
  };
}

export function createDbLogger(options: DbLoggerOptions = {}): DbLogger {
  return {
    info: (event, context) => writeDbLog("info", event, context, options),
    warn: (event, context) => writeDbLog("warn", event, context, options),
    error: (event, context) => writeDbLog("error", event, context, options),
  };
}

function writeDbLog(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {},
  options: DbLoggerOptions,
): void {
  const entry = createDbLogEntry(level, event, context, options);
  persistEntry(entry, options);
  if (options.writeToConsole !== false) {
    writeConsole(entry, level);
  }
}

function persistEntry(entry: Record<string, unknown>, options: DbLoggerOptions): void {
  const logDir = options.logDir ?? defaultLogDir();
  const timestamp = String(entry.timestamp);
  const date = timestamp.slice(0, 10);
  mkdirSync(logDir, { recursive: true });
  appendFileSync(resolve(logDir, `${date}.jsonl`), `${JSON.stringify(entry)}\n`, "utf-8");
}

function writeConsole(entry: Record<string, unknown>, level: LogLevel): void {
  const line = `${JSON.stringify(entry)}\n`;
  if (level === "error" || level === "warn") {
    process.stderr.write(line);
    return;
  }

  process.stdout.write(line);
}

function defaultLogDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), "..", "..", "..", "logs", LOG_SERVICES.DB);
}

function sanitizeRecord(context: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, sanitizeValue(key, value)]),
  );
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) {
    return REDACTED;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(key, item));
  }
  if (value && typeof value === "object") {
    return sanitizeRecord(value as Record<string, unknown>);
  }
  return value;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.replaceAll("-", "_").toLowerCase());
}
