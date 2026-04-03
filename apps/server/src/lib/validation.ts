import type { Logger } from "pino";
import type { Socket } from "socket.io";
import type { z } from "zod";
import { handlerLogContext } from "./handlerContext.js";

interface ValidationOptions {
  roomCode?: string;
  eventType: string;
  invalidMessage?: string;
  onReject?: (message: string) => void;
}

/**
 * Validates a payload against a Zod schema and handles rejection if invalid.
 *
 * This function centralizes the common pattern of:
 * 1. Validating payload with Zod
 * 2. Logging rejection with consistent fields
 * 3. Calling custom rejection handler or doing nothing
 * 4. Returning null on validation failure
 *
 * @param socket - Socket connection
 * @param logger - Logger instance
 * @param schema - Zod schema to validate against
 * @param data - Unknown payload data
 * @param options - Event type, optional room code, and optional rejection handler
 * @returns Parsed data if valid, null if invalid
 */
export function validatePayloadOrReject<T>(
  socket: Socket,
  logger: Logger,
  schema: z.ZodSchema<T>,
  data: unknown,
  options: ValidationOptions,
): T | null {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    logger.warn({
      event: `${options.eventType}_rejected`,
      ...handlerLogContext(options.roomCode, socket),
      reason: "invalid_payload",
    });
    options.onReject?.(options.invalidMessage ?? "Invalid payload.");
    return null;
  }
  return parsed.data;
}
