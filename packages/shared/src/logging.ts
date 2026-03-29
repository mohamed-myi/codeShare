import { z } from "zod";

export const LOG_SERVICES = {
  SERVER: "codeshare-server",
  CLIENT: "codeshare-client",
  DB: "codeshare-db",
  LOAD_TESTS: "codeshare-load-tests",
} as const;

export const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

export const logEventSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "event must be snake_case");

export const CLIENT_LOG_EVENTS = {
  CLIENT_API_REQUEST_FAILED: "client_api_request_failed",
  CLIENT_CLIPBOARD_COPY_FAILED: "client_clipboard_copy_failed",
  CLIENT_HINT_FAILED: "client_hint_failed",
  CLIENT_LOG_INGEST_FAILED: "client_log_ingest_failed",
  CLIENT_JOIN_EMIT_FAILED: "client_join_emit_failed",
  CLIENT_PROBLEM_IMPORT_FAILED: "client_problem_import_failed",
  CLIENT_RENDER_FAILED: "client_render_failed",
  CLIENT_SESSION_PERSIST_FAILED: "client_session_persist_failed",
  CLIENT_SOCKET_CONNECTED: "client_socket_connected",
  CLIENT_SOCKET_CONNECT_FAILED: "client_socket_connect_failed",
  CLIENT_SOCKET_DISCONNECTED: "client_socket_disconnected",
  CLIENT_SOCKET_EVENT_REJECTED: "client_socket_event_rejected",
  CLIENT_STORAGE_READ_FAILED: "client_storage_read_failed",
  CLIENT_STORAGE_WRITE_FAILED: "client_storage_write_failed",
  CLIENT_TESTCASE_FAILED: "client_testcase_failed",
  CLIENT_YJS_CONNECTED: "client_yjs_connected",
  CLIENT_YJS_CONNECT_STARTED: "client_yjs_connect_started",
  CLIENT_YJS_CONNECTION_FAILED: "client_yjs_connection_failed",
  CLIENT_YJS_DISCONNECTED: "client_yjs_disconnected",
  CLIENT_YJS_TOKEN_MISSING: "client_yjs_token_missing",
} as const;

export const clientLogPayloadSchema = z.object({
  level: logLevelSchema,
  event: logEventSchema,
  service: z.literal(LOG_SERVICES.CLIENT),
  timestamp: z.string().datetime().optional(),
  request_id: z.string().trim().min(1).optional(),
  socket_id: z.string().trim().min(1).optional(),
  room_code: z.string().trim().min(1).optional(),
  route: z.string().trim().min(1).optional(),
  error_type: z.string().trim().min(1).optional(),
  error_message: z.string().trim().min(1).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type LogLevel = z.infer<typeof logLevelSchema>;
export type ClientLogEvent = (typeof CLIENT_LOG_EVENTS)[keyof typeof CLIENT_LOG_EVENTS];
export type ClientLogPayload = z.infer<typeof clientLogPayloadSchema>;
