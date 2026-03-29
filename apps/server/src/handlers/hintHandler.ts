import type { Hint, HintDonePayload, HintPendingPayload, Problem } from "@codeshare/shared";
import { SocketEvents, TIMEOUTS } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import type * as Y from "yjs";
import { dependencyErrorLogFields } from "../lib/dependencyError.js";
import type { IpRateLimiter } from "../lib/ipRateLimiter.js";
import { requestIdLogField, roomCodeLogFields } from "../lib/logger.js";
import { globalCounters } from "../lib/rateLimitCounters.js";
import type { Room } from "../models/Room.js";
import { hintService } from "../services/HintService.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
}

type HintMessage = {
  role: "system" | "user";
  content: string;
};

interface HintRejection {
  reason: string;
  message: string;
  extra?: Record<string, unknown>;
  level?: "info" | "warn" | "error";
}

interface HintSession {
  io: Server;
  socket: Socket;
  logger: Logger;
  deps: HintHandlerDeps;
  room: Room;
  roomCode: string;
}

interface PreparedLLMHintRequest {
  messages: HintMessage[];
}

export interface HintHandlerDeps {
  roomLookup: RoomLookup;
  getDoc: (roomCode: string) => Y.Doc | undefined;
  groqClient?: {
    streamCompletion(messages: HintMessage[]): AsyncGenerator<string>;
  };
  enableLLMHintFallback: boolean;
  enableImportedProblemHints: boolean;
  maxLLMPromptChars: number;
  maxLLMHintChars: number;
  maxLLMCallsPerRoom: number;
  hintConsentMs?: number;
  hintCooldownMs?: number;
  ipRateLimiter?: IpRateLimiter;
  llmCallsPerHourPerIp?: number;
  llmDailyLimit?: number;
  findStoredHint: (problemId: string, hintsUsed: number) => Promise<Hint | null>;
  findProblem: (problemId: string) => Promise<Problem | null>;
}

const DEFAULT_HINT_COOLDOWN_MS = 5_000;

// Per-room consent timers, keyed by roomCode. Cleared on approve, deny, timeout, or requester disconnect.
const consentTimers = new Map<string, NodeJS.Timeout>();

function clearConsentTimer(roomCode: string): void {
  const timer = consentTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    consentTimers.delete(roomCode);
  }
}

function emitHintLog(
  logger: Logger,
  level: HintRejection["level"],
  payload: Record<string, unknown>,
): void {
  switch (level) {
    case "warn":
      logger.warn(payload);
      return;
    case "error":
      logger.error(payload);
      return;
    default:
      logger.info(payload);
  }
}

function rejectHintRequest(session: HintSession, rejection: HintRejection): void {
  emitHintLog(session.logger, rejection.level, {
    event: "hint_request_rejected",
    ...roomCodeLogFields(session.roomCode),
    ...requestIdLogField(session.socket),
    ...rejection.extra,
    reason: rejection.reason,
  });
  session.socket.emit(SocketEvents.HINT_ERROR, {
    message: rejection.message,
  });
}

function clearPendingHintRequest(session: HintSession): string | null {
  const requesterId = session.room.pendingHintRequest?.requestedBy ?? null;
  session.room.pendingHintRequest = null;
  session.io.to(session.roomCode).emit(SocketEvents.ROOM_SYNC, session.room.toSyncPayload());
  return requesterId;
}

function findRequester(room: Room, requesterId: string | null) {
  if (!requesterId) {
    return null;
  }

  return room.users.find((user) => user.id === requesterId) ?? null;
}

function createSession(
  io: Server,
  socket: Socket,
  logger: Logger,
  deps: HintHandlerDeps,
): HintSession | null {
  const roomCode = socket.data.roomCode as string;
  const room = deps.roomLookup.getRoom(roomCode);

  if (!room) {
    return null;
  }

  return { io, socket, logger, deps, room, roomCode };
}

function getHintRequestRejection(
  session: HintSession,
  hintCooldownMs: number,
): HintRejection | null {
  const now = Date.now();
  const lastRequest = (session.socket.data.lastHintRequestTime as number | undefined) ?? 0;
  if (now - lastRequest < hintCooldownMs) {
    return {
      reason: "cooldown_active",
      message: "Please wait a few seconds before requesting another hint.",
    };
  }

  // Preserve existing semantics where any request attempt starts the cooldown window,
  // even if later validation rejects the request.
  session.socket.data.lastHintRequestTime = now;

  if (!session.room.problemId) {
    return {
      reason: "problem_not_selected",
      message: "Select a problem to request hints.",
    };
  }

  if (session.room.hintsUsed >= session.room.hintLimit) {
    return {
      reason: "hint_limit_reached",
      message: "No more hints available.",
      extra: {
        hints_used: session.room.hintsUsed,
        hint_limit: session.room.hintLimit,
      },
    };
  }

  if (session.room.executionInProgress) {
    return {
      reason: "execution_in_progress",
      message: "Cannot request hints while code is executing.",
    };
  }

  if (session.room.pendingHintRequest !== null) {
    return {
      reason: "hint_request_pending",
      message: "A hint request is already pending.",
    };
  }

  if (session.room.hintStreaming) {
    return {
      reason: "hint_streaming_in_progress",
      message: "A hint is currently being delivered.",
    };
  }

  return null;
}

function sendPendingHintRequest(session: HintSession): void {
  const requester = session.room.users.find((user) => user.socketId === session.socket.id);
  if (!requester) {
    return;
  }

  session.room.pendingHintRequest = {
    requestedBy: requester.id,
    requestedAt: new Date().toISOString(),
  };
  session.logger.info({
    event: "hint_request_pending",
    ...roomCodeLogFields(session.roomCode),
    ...requestIdLogField(session.socket),
    requested_by: requester.id,
  });
  session.io.to(session.roomCode).emit(SocketEvents.ROOM_SYNC, session.room.toSyncPayload());

  const otherUser = session.room.users.find(
    (user) => user.connected && user.socketId !== session.socket.id,
  );
  if (!otherUser?.socketId) {
    return;
  }

  session.io.to(otherUser.socketId).emit(SocketEvents.HINT_PENDING, {
    requestedBy: requester.id,
    displayName: requester.displayName,
    hintsUsed: session.room.hintsUsed,
    hintLimit: session.room.hintLimit,
  } satisfies HintPendingPayload);

  startConsentTimer(session);
}

function startConsentTimer(session: HintSession): void {
  clearConsentTimer(session.roomCode);
  const timer = setTimeout(() => {
    consentTimers.delete(session.roomCode);
    if (!session.room.pendingHintRequest) {
      return;
    }

    const requester = findRequester(session.room, clearPendingHintRequest(session));
    if (!requester?.socketId) {
      return;
    }

    session.logger.info({
      event: "hint_request_denied",
      ...roomCodeLogFields(session.roomCode),
      ...requestIdLogField(session.socket),
      requested_by: requester.id,
      reason: "consent_timeout",
    });
    session.io.to(requester.socketId).emit(SocketEvents.HINT_DENIED);
  }, session.deps.hintConsentMs ?? TIMEOUTS.HINT_CONSENT_MS);

  consentTimers.set(session.roomCode, timer);
}

function handleHintDeny(session: HintSession, reason: "peer_denied" | "consent_timeout"): void {
  clearConsentTimer(session.roomCode);
  const requester = findRequester(session.room, clearPendingHintRequest(session));

  if (!requester?.socketId) {
    return;
  }

  session.logger.info({
    event: "hint_request_denied",
    ...roomCodeLogFields(session.roomCode),
    ...requestIdLogField(session.socket),
    requested_by: requester.id,
    reason,
  });
  session.io.to(requester.socketId).emit(SocketEvents.HINT_DENIED);
}

function emitHintDelivered(session: HintSession, fullHint: string, source: "stored" | "llm"): void {
  const hintsRemaining = session.room.hintLimit - session.room.hintsUsed;
  session.logger.info({
    event: "hint_delivered",
    ...roomCodeLogFields(session.roomCode),
    ...requestIdLogField(session.socket),
    source,
    hints_remaining: hintsRemaining,
  });
  session.io.to(session.roomCode).emit(SocketEvents.HINT_DONE, {
    fullHint,
    hintsRemaining,
  } satisfies HintDonePayload);
}

function deliverStoredHint(session: HintSession, hint: Hint): void {
  session.room.hintsUsed += 1;
  session.room.hintHistory.push(hint.hintText);
  emitHintDelivered(session, hint.hintText, "stored");
}

function getClientIp(socket: Socket): string {
  return (socket.data.clientIp as string | undefined) ?? "unknown";
}

function rejectLLMHintRequest(session: HintSession, rejection: HintRejection): null {
  rejectHintRequest(session, rejection);
  return null;
}

async function prepareLLMHintRequest(session: HintSession): Promise<PreparedLLMHintRequest | null> {
  if (!session.deps.enableLLMHintFallback) {
    return rejectLLMHintRequest(session, {
      reason: "llm_fallback_disabled",
      message: "No more curated hints available for this problem.",
    });
  }

  if (session.room.llmCallsUsed >= session.deps.maxLLMCallsPerRoom) {
    return rejectLLMHintRequest(session, {
      reason: "room_llm_limit_reached",
      message: "AI hint limit for this room has been reached.",
      extra: {
        llm_calls_used: session.room.llmCallsUsed,
        llm_call_limit: session.deps.maxLLMCallsPerRoom,
      },
    });
  }

  if (!globalCounters.canCallLLM(session.deps.llmDailyLimit ?? 500)) {
    return rejectLLMHintRequest(session, {
      reason: "daily_llm_limit_reached",
      message: "Daily AI hint limit reached. Please try again tomorrow.",
      extra: {
        daily_limit: session.deps.llmDailyLimit ?? 500,
      },
      level: "warn",
    });
  }

  if (session.deps.ipRateLimiter) {
    const clientIp = getClientIp(session.socket);
    const ipCheck = session.deps.ipRateLimiter.consume(
      "llm-hint",
      clientIp,
      session.deps.llmCallsPerHourPerIp ?? 20,
      3_600_000,
    );
    if (!ipCheck.allowed) {
      return rejectLLMHintRequest(session, {
        reason: "ip_limit_reached",
        message: `Too many hint requests. Try again in ${ipCheck.retryAfterSeconds}s.`,
        extra: {
          client_ip: clientIp,
          retry_after_seconds: ipCheck.retryAfterSeconds,
        },
        level: "warn",
      });
    }
  }

  if (!session.deps.groqClient) {
    return rejectLLMHintRequest(session, {
      reason: "groq_client_missing",
      message: "AI hint fallback is unavailable because Groq is not configured.",
      level: "error",
    });
  }

  const problem = await session.deps.findProblem(session.room.problemId as string);
  if (!problem) {
    return rejectLLMHintRequest(session, {
      reason: "problem_not_found",
      message: "Problem not found.",
      extra: {
        problem_id: session.room.problemId,
      },
      level: "warn",
    });
  }

  if (problem.source === "user_submitted" && !session.deps.enableImportedProblemHints) {
    return rejectLLMHintRequest(session, {
      reason: "imported_problem_hints_disabled",
      message: "AI hints for imported problems are disabled.",
      extra: {
        problem_id: session.room.problemId,
      },
    });
  }

  const currentCode = session.deps.getDoc(session.roomCode)?.getText("monaco").toString() ?? "";
  return {
    messages: hintService.buildLLMMessages(
      {
        description: problem.description,
        constraints: problem.constraints,
        currentCode,
        hintLevel: Math.min(session.room.hintsUsed + 1, 3),
        previousHints: session.room.hintHistory,
      },
      session.deps.maxLLMPromptChars,
    ),
  };
}

async function streamLLMHint(session: HintSession, request: PreparedLLMHintRequest): Promise<void> {
  session.room.hintStreaming = true;
  let generatedHint = "";
  const maxAccumulateChars = session.deps.maxLLMHintChars * 2;
  const groqStart = Date.now();

  try {
    for await (const chunk of session.deps.groqClient?.streamCompletion(request.messages) ?? []) {
      generatedHint += chunk;
      session.io.to(session.roomCode).emit(SocketEvents.HINT_CHUNK, { text: chunk });
      if (generatedHint.length > maxAccumulateChars) {
        break;
      }
    }

    const durationMs = Date.now() - groqStart;
    session.logger.info(
      {
        event: "hint_stream_completed",
        ...roomCodeLogFields(session.roomCode),
        ...requestIdLogField(session.socket),
        dependency: "groq",
        duration_ms: durationMs,
      },
      "Groq LLM streaming completed",
    );

    const fullHint = hintService.sanitizeLLMHint(generatedHint, session.deps.maxLLMHintChars);
    session.room.hintsUsed += 1;
    session.room.llmCallsUsed += 1;
    globalCounters.recordLLMCall();
    session.room.hintHistory.push(fullHint);
    emitHintDelivered(session, fullHint, "llm");
  } catch (streamErr) {
    const durationMs = Date.now() - groqStart;
    session.logger.error(
      {
        event: "hint_stream_failed",
        err: streamErr,
        ...roomCodeLogFields(session.roomCode),
        ...requestIdLogField(session.socket),
        dependency: "groq",
        duration_ms: durationMs,
        ...dependencyErrorLogFields(streamErr),
      },
      "LLM hint streaming failed",
    );
    session.socket.emit(SocketEvents.HINT_ERROR, {
      message:
        streamErr instanceof Error && /empty|code|solution/i.test(streamErr.message)
          ? "Generated hint was blocked by the output policy."
          : "Failed to generate hint. Please try again.",
    });
  } finally {
    session.room.hintStreaming = false;
  }
}

async function deliverHint(session: HintSession): Promise<void> {
  try {
    const hint = await session.deps.findStoredHint(
      session.room.problemId as string,
      session.room.hintsUsed,
    );
    if (hint) {
      deliverStoredHint(session, hint);
      return;
    }

    const llmRequest = await prepareLLMHintRequest(session);
    if (!llmRequest) {
      return;
    }

    await streamLLMHint(session, llmRequest);
  } catch (err) {
    session.logger.error(
      {
        event: "hint_delivery_failed",
        err,
        ...roomCodeLogFields(session.roomCode),
        ...requestIdLogField(session.socket),
        ...dependencyErrorLogFields(err),
      },
      "Failed to deliver hint",
    );
    session.socket.emit(SocketEvents.HINT_ERROR, {
      message: "Failed to retrieve hint. Please try again.",
    });
  }
}

async function handleHintRequest(session: HintSession, hintCooldownMs: number): Promise<void> {
  const rejection = getHintRequestRejection(session, hintCooldownMs);
  if (rejection) {
    rejectHintRequest(session, rejection);
    return;
  }

  if (session.room.connectedUserCount() <= 1) {
    await deliverHint(session);
    return;
  }

  sendPendingHintRequest(session);
}

async function handleHintApprove(session: HintSession): Promise<void> {
  if (!session.room.pendingHintRequest) {
    return;
  }

  clearConsentTimer(session.roomCode);
  clearPendingHintRequest(session);
  session.logger.info({
    event: "hint_request_approved",
    ...roomCodeLogFields(session.roomCode),
    ...requestIdLogField(session.socket),
  });
  await deliverHint(session);
}

function handleRequesterDisconnect(session: HintSession): void {
  if (!session.room.pendingHintRequest) {
    return;
  }

  // Room handler clears socketId before this runs, so match by checking whether
  // the original requester is now marked disconnected.
  const requester = session.room.users.find(
    (user) => user.id === session.room.pendingHintRequest?.requestedBy,
  );
  if (requester && !requester.connected) {
    clearConsentTimer(session.roomCode);
    clearPendingHintRequest(session);
  }
}

export function registerHintHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  deps: HintHandlerDeps,
): void {
  const hintCooldownMs = deps.hintCooldownMs ?? DEFAULT_HINT_COOLDOWN_MS;

  socket.on(SocketEvents.HINT_REQUEST, async () => {
    const session = createSession(io, socket, logger, deps);
    if (!session) {
      return;
    }

    await handleHintRequest(session, hintCooldownMs);
  });

  socket.on(SocketEvents.HINT_APPROVE, async () => {
    const session = createSession(io, socket, logger, deps);
    if (!session) {
      return;
    }

    await handleHintApprove(session);
  });

  socket.on(SocketEvents.HINT_DENY, () => {
    const session = createSession(io, socket, logger, deps);
    if (!session || !session.room.pendingHintRequest) {
      return;
    }

    handleHintDeny(session, "peer_denied");
  });

  socket.on("disconnect", () => {
    const session = createSession(io, socket, logger, deps);
    if (!session) {
      return;
    }

    handleRequesterDisconnect(session);
  });
}
