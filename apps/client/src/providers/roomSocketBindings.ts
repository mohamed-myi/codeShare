import type {
  ClientLogEvent,
  CustomTestCase,
  EventRejectedPayload,
  ExecutionError,
  ExecutionResult,
  HintDonePayload,
  HintPendingPayload,
  ImportStatusPayload,
  ProblemLoadedPayload,
  RoomState,
  UserJoinedPayload,
  YjsTokenRotatedPayload,
} from "@codeshare/shared";
import { CLIENT_LOG_EVENTS, SocketEvents } from "@codeshare/shared";
import type { Dispatch } from "react";
import type { Socket } from "socket.io-client";
import type { BrowserLogInput } from "../lib/logger.ts";
import { getJoinAckDelayMs } from "../lib/testControls.ts";
import type { RoomAction } from "../reducers/roomReducer.ts";

const JOIN_MARKER = "__codeshareJoinedSocketId";

type MarkedSocket = Socket & {
  [JOIN_MARKER]?: string;
};

interface RoomLogger {
  warn: (entry: BrowserLogInput) => Promise<void> | void;
  error: (entry: BrowserLogInput) => Promise<void> | void;
}

interface SessionPersistFailureLoggerOptions {
  logger: RoomLogger;
  roomCode: string | undefined;
  socket: Socket;
}

interface EmitJoinOptions extends SessionPersistFailureLoggerOptions {
  logSessionPersistFailure: (
    error: unknown,
    storageKey: string,
    event?: ClientLogEvent,
  ) => Promise<void>;
}

interface RoomSocketHandlerOptions extends SessionPersistFailureLoggerOptions {
  dispatch: Dispatch<RoomAction>;
  logSessionPersistFailure: (
    error: unknown,
    storageKey: string,
    event?: ClientLogEvent,
  ) => Promise<void>;
}

interface RoomSocketHandlers {
  onConnect: () => void;
  onDisconnect: () => void;
  onUserJoined: (payload: UserJoinedPayload) => void;
  onUserLeft: (payload: { userId: string }) => void;
  onRoomSync: (payload: RoomState) => void;
  onExecutionStarted: (payload: { executionType: "run" | "submit" }) => void;
  onExecutionResult: (payload: ExecutionResult) => void;
  onExecutionError: (payload: ExecutionError) => void;
  onHintPending: (payload: HintPendingPayload) => void;
  onHintChunk: (payload: { text: string }) => void;
  onHintDone: (payload: HintDonePayload) => void;
  onHintDenied: () => void;
  onEventRejected: (payload: EventRejectedPayload) => void;
  onProblemLoaded: (payload: ProblemLoadedPayload) => void;
  onProblemError: (payload: { message: string }) => void;
  onImportStatus: (payload: ImportStatusPayload) => void;
  onHintError: (payload: { message: string }) => void;
  onTestcaseAdded: (payload: { testCase: CustomTestCase }) => void;
  onTestcaseError: (payload: { message: string }) => void;
  onSolutionRevealed: (payload: { solution: string }) => void;
  onYjsTokenRotated: (payload: YjsTokenRotatedPayload) => void;
  cleanup?: () => void;
}

export function createSessionPersistFailureLogger({
  logger,
  roomCode,
  socket,
}: SessionPersistFailureLoggerOptions) {
  return async (
    error: unknown,
    storageKey: string,
    event: ClientLogEvent = CLIENT_LOG_EVENTS.CLIENT_SESSION_PERSIST_FAILED,
  ) => {
    await logger.error({
      event,
      roomCode,
      socketId: socket.id,
      error: error instanceof Error ? error : new Error("Session persistence failed."),
      context: {
        storage_key: storageKey,
      },
    });
  };
}

export function emitJoin({ socket, roomCode, logger, logSessionPersistFailure }: EmitJoinOptions) {
  const markedSocket = socket as MarkedSocket;
  let displayName: string | null = null;

  try {
    displayName = sessionStorage.getItem("displayName")?.trim() ?? null;
  } catch (error) {
    void logSessionPersistFailure(
      error,
      "displayName",
      CLIENT_LOG_EVENTS.CLIENT_STORAGE_READ_FAILED,
    );
    return;
  }

  if (!displayName || !socket.connected || !socket.id || markedSocket[JOIN_MARKER] === socket.id) {
    return;
  }

  markedSocket[JOIN_MARKER] = socket.id;

  try {
    const reconnectToken = sessionStorage.getItem("reconnectToken");
    socket.emit(
      SocketEvents.USER_JOIN,
      reconnectToken ? { displayName, reconnectToken } : { displayName },
    );
  } catch (error) {
    delete markedSocket[JOIN_MARKER];
    void logger.error({
      event: CLIENT_LOG_EVENTS.CLIENT_JOIN_EMIT_FAILED,
      roomCode,
      socketId: socket.id,
      error: error instanceof Error ? error : new Error("Join emission failed."),
    });
  }
}

export function clearJoinMarker(socket: Socket) {
  delete (socket as MarkedSocket)[JOIN_MARKER];
}

function storeSessionValue(
  payloadValue: string | undefined,
  storageKey: string,
  logSessionPersistFailure: (
    error: unknown,
    storageKey: string,
    event?: ClientLogEvent,
  ) => Promise<void>,
) {
  if (!payloadValue) {
    return;
  }

  try {
    sessionStorage.setItem(storageKey, payloadValue);
  } catch (error) {
    void logSessionPersistFailure(error, storageKey);
  }
}

export function createRoomSocketHandlers({
  dispatch,
  logger,
  roomCode,
  socket,
  logSessionPersistFailure,
}: RoomSocketHandlerOptions): RoomSocketHandlers {
  const pendingTimers = new Set<number>();
  const joinAckDelayMs = getJoinAckDelayMs();

  return {
    onConnect: () => {
      emitJoin({ socket, roomCode, logger, logSessionPersistFailure });
    },
    onDisconnect: () => {
      clearJoinMarker(socket);
    },
    onUserJoined: (payload) => {
      storeSessionValue(payload.reconnectToken, "reconnectToken", logSessionPersistFailure);
      storeSessionValue(payload.yjsToken, "yjsToken", logSessionPersistFailure);
      if (joinAckDelayMs <= 0) {
        dispatch({ type: "USER_JOINED", payload });
        return;
      }

      const timer = window.setTimeout(() => {
        pendingTimers.delete(timer);
        dispatch({ type: "USER_JOINED", payload });
      }, joinAckDelayMs);
      pendingTimers.add(timer);
    },
    onUserLeft: (payload) => {
      dispatch({ type: "USER_LEFT", payload });
    },
    onRoomSync: (payload) => {
      dispatch({ type: "ROOM_SYNC", payload });
    },
    onExecutionStarted: (payload) => {
      dispatch({ type: "EXECUTION_STARTED", payload });
    },
    onExecutionResult: (payload) => {
      dispatch({ type: "EXECUTION_RESULT", payload });
    },
    onExecutionError: (payload) => {
      dispatch({ type: "EXECUTION_ERROR", payload });
    },
    onHintPending: (payload) => {
      dispatch({ type: "HINT_PENDING", payload });
    },
    onHintChunk: (payload) => {
      dispatch({ type: "HINT_CHUNK", payload });
    },
    onHintDone: (payload) => {
      dispatch({ type: "HINT_DONE", payload });
    },
    onHintDenied: () => {
      dispatch({ type: "HINT_DENIED" });
    },
    onEventRejected: (payload) => {
      void logger.warn({
        event: CLIENT_LOG_EVENTS.CLIENT_SOCKET_EVENT_REJECTED,
        roomCode,
        socketId: socket.id,
        context: {
          rejected_event: payload.event,
          reason: payload.reason,
        },
      });
      dispatch({ type: "EVENT_REJECTED", payload });
    },
    onProblemLoaded: (payload) => {
      dispatch({ type: "PROBLEM_LOADED", payload });
    },
    onProblemError: (payload) => {
      dispatch({ type: "PROBLEM_ERROR", payload });
    },
    onImportStatus: (payload) => {
      if (payload.status === "failed") {
        void logger.error({
          event: CLIENT_LOG_EVENTS.CLIENT_PROBLEM_IMPORT_FAILED,
          roomCode,
          socketId: socket.id,
          context: {
            message: payload.message ?? "Problem import failed.",
            retry_after_seconds: payload.retryAfterSeconds,
          },
        });
      }
      dispatch({ type: "IMPORT_STATUS", payload });
    },
    onHintError: (payload) => {
      void logger.error({
        event: CLIENT_LOG_EVENTS.CLIENT_HINT_FAILED,
        roomCode,
        socketId: socket.id,
        context: {
          message: payload.message,
        },
      });
      dispatch({ type: "HINT_ERROR", payload });
    },
    onTestcaseAdded: (payload) => {
      dispatch({ type: "TESTCASE_ADDED", payload });
    },
    onTestcaseError: (payload) => {
      void logger.error({
        event: CLIENT_LOG_EVENTS.CLIENT_TESTCASE_FAILED,
        roomCode,
        socketId: socket.id,
        context: {
          message: payload.message,
        },
      });
      dispatch({ type: "TESTCASE_ERROR", payload });
    },
    onSolutionRevealed: (payload) => {
      dispatch({ type: "SOLUTION_REVEALED", payload });
    },
    onYjsTokenRotated: (payload) => {
      storeSessionValue(payload.yjsToken, "yjsToken", logSessionPersistFailure);
      dispatch({ type: "YJS_TOKEN_ROTATED" });
    },
    cleanup: () => {
      for (const timer of pendingTimers) {
        window.clearTimeout(timer);
      }
      pendingTimers.clear();
    },
  };
}

export function bindSocketHandlers(socket: Socket, handlers: RoomSocketHandlers) {
  socket.on("connect", handlers.onConnect);
  socket.on("disconnect", handlers.onDisconnect);
  socket.on(SocketEvents.USER_JOINED, handlers.onUserJoined);
  socket.on(SocketEvents.USER_LEFT, handlers.onUserLeft);
  socket.on(SocketEvents.ROOM_SYNC, handlers.onRoomSync);
  socket.on(SocketEvents.EXECUTION_STARTED, handlers.onExecutionStarted);
  socket.on(SocketEvents.EXECUTION_RESULT, handlers.onExecutionResult);
  socket.on(SocketEvents.EXECUTION_ERROR, handlers.onExecutionError);
  socket.on(SocketEvents.HINT_PENDING, handlers.onHintPending);
  socket.on(SocketEvents.HINT_CHUNK, handlers.onHintChunk);
  socket.on(SocketEvents.HINT_DONE, handlers.onHintDone);
  socket.on(SocketEvents.HINT_DENIED, handlers.onHintDenied);
  socket.on(SocketEvents.EVENT_REJECTED, handlers.onEventRejected);
  socket.on(SocketEvents.PROBLEM_LOADED, handlers.onProblemLoaded);
  socket.on(SocketEvents.PROBLEM_ERROR, handlers.onProblemError);
  socket.on(SocketEvents.PROBLEM_IMPORT_STATUS, handlers.onImportStatus);
  socket.on(SocketEvents.HINT_ERROR, handlers.onHintError);
  socket.on(SocketEvents.TESTCASE_ADDED, handlers.onTestcaseAdded);
  socket.on(SocketEvents.TESTCASE_ERROR, handlers.onTestcaseError);
  socket.on(SocketEvents.SOLUTION_REVEALED, handlers.onSolutionRevealed);
  socket.on(SocketEvents.YJS_TOKEN_ROTATED, handlers.onYjsTokenRotated);

  return () => {
    socket.off("connect", handlers.onConnect);
    socket.off("disconnect", handlers.onDisconnect);
    socket.off(SocketEvents.USER_JOINED, handlers.onUserJoined);
    socket.off(SocketEvents.USER_LEFT, handlers.onUserLeft);
    socket.off(SocketEvents.ROOM_SYNC, handlers.onRoomSync);
    socket.off(SocketEvents.EXECUTION_STARTED, handlers.onExecutionStarted);
    socket.off(SocketEvents.EXECUTION_RESULT, handlers.onExecutionResult);
    socket.off(SocketEvents.EXECUTION_ERROR, handlers.onExecutionError);
    socket.off(SocketEvents.HINT_PENDING, handlers.onHintPending);
    socket.off(SocketEvents.HINT_CHUNK, handlers.onHintChunk);
    socket.off(SocketEvents.HINT_DONE, handlers.onHintDone);
    socket.off(SocketEvents.HINT_DENIED, handlers.onHintDenied);
    socket.off(SocketEvents.EVENT_REJECTED, handlers.onEventRejected);
    socket.off(SocketEvents.PROBLEM_LOADED, handlers.onProblemLoaded);
    socket.off(SocketEvents.PROBLEM_ERROR, handlers.onProblemError);
    socket.off(SocketEvents.PROBLEM_IMPORT_STATUS, handlers.onImportStatus);
    socket.off(SocketEvents.HINT_ERROR, handlers.onHintError);
    socket.off(SocketEvents.TESTCASE_ADDED, handlers.onTestcaseAdded);
    socket.off(SocketEvents.TESTCASE_ERROR, handlers.onTestcaseError);
    socket.off(SocketEvents.SOLUTION_REVEALED, handlers.onSolutionRevealed);
    socket.off(SocketEvents.YJS_TOKEN_ROTATED, handlers.onYjsTokenRotated);
    handlers.cleanup?.();
  };
}
