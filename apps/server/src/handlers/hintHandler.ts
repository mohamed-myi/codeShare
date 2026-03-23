import type { Hint, HintDonePayload, HintPendingPayload, Problem } from "@codeshare/shared";
import { SocketEvents, TIMEOUTS } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import type * as Y from "yjs";
import type { Room } from "../models/Room.js";
import { hintService } from "../services/HintService.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
}

export interface HintHandlerDeps {
  roomLookup: RoomLookup;
  getDoc: (roomCode: string) => Y.Doc | undefined;
  groqClient?: {
    streamCompletion(
      messages: Array<{ role: "system" | "user"; content: string }>,
    ): AsyncGenerator<string>;
  };
  enableLLMHintFallback: boolean;
  enableImportedProblemHints: boolean;
  maxLLMPromptChars: number;
  maxLLMHintChars: number;
  maxLLMCallsPerRoom: number;
  hintConsentMs?: number;
  findStoredHint: (problemId: string, hintsUsed: number) => Promise<Hint | null>;
  findProblem: (problemId: string) => Promise<Problem | null>;
}

// Per-room consent timers, keyed by roomCode. Cleared on approve, deny, timeout, or requester disconnect.
const consentTimers = new Map<string, NodeJS.Timeout>();

function clearConsentTimer(roomCode: string): void {
  const timer = consentTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    consentTimers.delete(roomCode);
  }
}

function clearPendingHintRequest(io: Server, roomCode: string, room: Room): string | null {
  const requesterId = room.pendingHintRequest?.requestedBy ?? null;
  room.pendingHintRequest = null;
  io.to(roomCode).emit(SocketEvents.ROOM_SYNC, room.toSyncPayload());
  return requesterId;
}

function findRequester(room: Room, requesterId: string | null) {
  if (!requesterId) {
    return null;
  }

  return room.users.find((user) => user.id === requesterId) ?? null;
}

export function registerHintHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  deps: HintHandlerDeps,
): void {
  socket.on(SocketEvents.HINT_REQUEST, async () => {
    const roomCode = socket.data.roomCode as string;
    const room = deps.roomLookup.getRoom(roomCode);
    if (!room) return;

    if (!room.problemId) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "Select a problem to request hints.",
      });
      return;
    }

    if (room.hintsUsed >= room.hintLimit) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "No more hints available.",
      });
      return;
    }

    if (room.executionInProgress) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "Cannot request hints while code is executing.",
      });
      return;
    }

    if (room.pendingHintRequest !== null) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "A hint request is already pending.",
      });
      return;
    }

    if (room.hintStreaming) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "A hint is currently being delivered.",
      });
      return;
    }

    // Single-user auto-approve: skip PENDING state
    if (room.connectedUserCount() <= 1) {
      await deliverHint(io, socket, logger, deps, room, roomCode);
      return;
    }

    // Multi-user consent flow: emit HINT_PENDING to other user
    const requester = room.users.find((u) => u.socketId === socket.id);
    if (!requester) return;

    room.pendingHintRequest = {
      requestedBy: requester.id,
      requestedAt: new Date().toISOString(),
    };
    io.to(roomCode).emit(SocketEvents.ROOM_SYNC, room.toSyncPayload());

    const otherUser = room.users.find((u) => u.connected && u.socketId !== socket.id);
    if (!otherUser?.socketId) return;

    io.to(otherUser.socketId).emit(SocketEvents.HINT_PENDING, {
      requestedBy: requester.id,
      displayName: requester.displayName,
      hintsUsed: room.hintsUsed,
      hintLimit: room.hintLimit,
    } satisfies HintPendingPayload);

    // Start 30s consent timeout
    clearConsentTimer(roomCode);
    const timer = setTimeout(() => {
      consentTimers.delete(roomCode);
      if (!room.pendingHintRequest) return;

      const requester = findRequester(room, clearPendingHintRequest(io, roomCode, room));

      if (requester?.socketId) {
        io.to(requester.socketId).emit(SocketEvents.HINT_DENIED);
      }
    }, deps.hintConsentMs ?? TIMEOUTS.HINT_CONSENT_MS);
    consentTimers.set(roomCode, timer);
  });

  socket.on(SocketEvents.HINT_APPROVE, async () => {
    const roomCode = socket.data.roomCode as string;
    const room = deps.roomLookup.getRoom(roomCode);
    if (!room) return;
    if (!room.pendingHintRequest) return;

    clearConsentTimer(roomCode);
    clearPendingHintRequest(io, roomCode, room);
    await deliverHint(io, socket, logger, deps, room, roomCode);
  });

  socket.on(SocketEvents.HINT_DENY, () => {
    const roomCode = socket.data.roomCode as string;
    const room = deps.roomLookup.getRoom(roomCode);
    if (!room) return;
    if (!room.pendingHintRequest) return;

    clearConsentTimer(roomCode);
    const requester = findRequester(room, clearPendingHintRequest(io, roomCode, room));

    if (requester?.socketId) {
      io.to(requester.socketId).emit(SocketEvents.HINT_DENIED);
    }
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode as string;
    const room = deps.roomLookup.getRoom(roomCode);
    if (!room || !room.pendingHintRequest) return;

    // Room handler clears socketId before this runs, so match by
    // checking if the requester is now disconnected.
    const requester = room.users.find((u) => u.id === room.pendingHintRequest?.requestedBy);
    if (requester && !requester.connected) {
      clearConsentTimer(roomCode);
      clearPendingHintRequest(io, roomCode, room);
    }
  });
}

async function deliverHint(
  io: Server,
  socket: Socket,
  logger: Logger,
  deps: HintHandlerDeps,
  room: Room,
  roomCode: string,
): Promise<void> {
  try {
    const hint = await deps.findStoredHint(room.problemId!, room.hintsUsed);

    if (hint) {
      room.hintsUsed += 1;
      room.hintHistory.push(hint.hintText);
      const hintsRemaining = room.hintLimit - room.hintsUsed;
      io.to(roomCode).emit(SocketEvents.HINT_DONE, {
        fullHint: hint.hintText,
        hintsRemaining,
      } satisfies HintDonePayload);
      return;
    }

    // LLM fallback when stored hints are exhausted
    if (!deps.enableLLMHintFallback) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "No more curated hints available for this problem.",
      });
      return;
    }

    if (room.llmCallsUsed >= deps.maxLLMCallsPerRoom) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "AI hint limit for this room has been reached.",
      });
      return;
    }

    if (!deps.groqClient) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "AI hint fallback is unavailable because Groq is not configured.",
      });
      return;
    }

    const problem = await deps.findProblem(room.problemId!);
    if (!problem) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "Problem not found.",
      });
      return;
    }

    if (problem.source === "user_submitted" && !deps.enableImportedProblemHints) {
      socket.emit(SocketEvents.HINT_ERROR, {
        message: "AI hints for imported problems are disabled.",
      });
      return;
    }

    const doc = deps.getDoc(roomCode);
    const currentCode = doc?.getText("monaco").toString() ?? "";

    const messages = hintService.buildLLMMessages(
      {
        description: problem.description,
        constraints: problem.constraints,
        currentCode,
        hintLevel: Math.min(room.hintsUsed + 1, 3),
        previousHints: room.hintHistory,
      },
      deps.maxLLMPromptChars,
    );

    room.hintStreaming = true;
    let generatedHint = "";
    const maxAccumulateChars = deps.maxLLMHintChars * 2;
    const groqStart = Date.now();

    try {
      for await (const chunk of deps.groqClient.streamCompletion(messages)) {
        generatedHint += chunk;
        io.to(roomCode).emit(SocketEvents.HINT_CHUNK, { text: chunk });
        if (generatedHint.length > maxAccumulateChars) break;
      }

      const groqLatencyMs = Date.now() - groqStart;
      logger.info({ roomCode, groqLatencyMs }, "Groq LLM streaming completed");

      const fullHint = hintService.sanitizeLLMHint(generatedHint, deps.maxLLMHintChars);
      room.hintsUsed += 1;
      room.llmCallsUsed += 1;
      room.hintHistory.push(fullHint);
      const hintsRemaining = room.hintLimit - room.hintsUsed;
      io.to(roomCode).emit(SocketEvents.HINT_DONE, {
        fullHint,
        hintsRemaining,
      } satisfies HintDonePayload);
    } catch (streamErr) {
      const groqLatencyMs = Date.now() - groqStart;
      logger.error({ err: streamErr, roomCode, groqLatencyMs }, "LLM hint streaming failed");
      socket.emit(SocketEvents.HINT_ERROR, {
        message:
          streamErr instanceof Error && /empty|code|solution/i.test(streamErr.message)
            ? "Generated hint was blocked by the output policy."
            : "Failed to generate hint. Please try again.",
      });
    } finally {
      room.hintStreaming = false;
    }
  } catch (err) {
    logger.error({ err, roomCode }, "Failed to deliver hint");
    socket.emit(SocketEvents.HINT_ERROR, {
      message: "Failed to retrieve hint. Please try again.",
    });
  }
}
