import crypto from "node:crypto";

/**
 * Generates a cryptographically random 128-bit hex reconnect token.
 */
export function generateReconnectToken(): string {
  return crypto.randomBytes(16).toString("hex");
}
