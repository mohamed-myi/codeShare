import type {
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
} from "@codeshare/shared";
import { SocketEvents } from "@codeshare/shared";
import { createContext, type Dispatch, type ReactNode, useEffect, useReducer } from "react";
import type { Socket } from "socket.io-client";
import { useSocket } from "../hooks/useSocket.ts";
import {
  type ClientRoomState,
  initialRoomState,
  type RoomAction,
  roomReducer,
} from "../reducers/roomReducer.ts";

interface RoomContextValue {
  state: ClientRoomState;
  dispatch: Dispatch<RoomAction>;
}

const JOIN_MARKER = "__codeshareJoinedSocketId";

type MarkedSocket = Socket & {
  [JOIN_MARKER]?: string;
};

export const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);

  useEffect(() => {
    if (!socket) return;

    const markedSocket = socket as MarkedSocket;

    const emitJoin = () => {
      const displayName = sessionStorage.getItem("displayName")?.trim();
      if (!displayName || !socket.connected || !socket.id) {
        return;
      }

      if (markedSocket[JOIN_MARKER] === socket.id) {
        return;
      }

      markedSocket[JOIN_MARKER] = socket.id;

      const reconnectToken = sessionStorage.getItem("reconnectToken");
      socket.emit(
        SocketEvents.USER_JOIN,
        reconnectToken ? { displayName, reconnectToken } : { displayName },
      );
    };

    const clearJoinMarker = () => {
      delete markedSocket[JOIN_MARKER];
    };

    const handleUserJoined = (payload: UserJoinedPayload) => {
      if (payload.reconnectToken) {
        sessionStorage.setItem("reconnectToken", payload.reconnectToken);
      }
      if (payload.yjsToken) {
        sessionStorage.setItem("yjsToken", payload.yjsToken);
      }

      dispatch({ type: "USER_JOINED", payload });
    };

    const handleUserLeft = (payload: { userId: string }) =>
      dispatch({ type: "USER_LEFT", payload });
    const handleRoomSync = (payload: RoomState) => dispatch({ type: "ROOM_SYNC", payload });
    const handleExecutionStarted = (payload: { executionType: "run" | "submit" }) =>
      dispatch({ type: "EXECUTION_STARTED", payload });
    const handleExecutionResult = (payload: ExecutionResult) =>
      dispatch({ type: "EXECUTION_RESULT", payload });
    const handleExecutionError = (payload: ExecutionError) =>
      dispatch({ type: "EXECUTION_ERROR", payload });
    const handleHintPending = (payload: HintPendingPayload) =>
      dispatch({ type: "HINT_PENDING", payload });
    const handleHintChunk = (payload: { text: string }) =>
      dispatch({ type: "HINT_CHUNK", payload });
    const handleHintDone = (payload: HintDonePayload) => dispatch({ type: "HINT_DONE", payload });
    const handleHintDenied = () => dispatch({ type: "HINT_DENIED" });
    const handleEventRejected = (payload: EventRejectedPayload) =>
      dispatch({ type: "EVENT_REJECTED", payload });
    const handleProblemLoaded = (payload: ProblemLoadedPayload) =>
      dispatch({ type: "PROBLEM_LOADED", payload });
    const handleProblemError = (payload: { message: string }) =>
      dispatch({ type: "PROBLEM_ERROR", payload });
    const handleImportStatus = (payload: ImportStatusPayload) =>
      dispatch({ type: "IMPORT_STATUS", payload });
    const handleHintError = (payload: { message: string }) =>
      dispatch({ type: "HINT_ERROR", payload });
    const handleTestcaseAdded = (payload: { testCase: CustomTestCase }) =>
      dispatch({ type: "TESTCASE_ADDED", payload });
    const handleTestcaseError = (payload: { message: string }) =>
      dispatch({ type: "TESTCASE_ERROR", payload });
    const handleSolutionRevealed = (payload: { solution: string }) =>
      dispatch({ type: "SOLUTION_REVEALED", payload });

    socket.on("connect", emitJoin);
    socket.on("disconnect", clearJoinMarker);
    socket.on(SocketEvents.USER_JOINED, handleUserJoined);
    socket.on(SocketEvents.USER_LEFT, handleUserLeft);
    socket.on(SocketEvents.ROOM_SYNC, handleRoomSync);
    socket.on(SocketEvents.EXECUTION_STARTED, handleExecutionStarted);
    socket.on(SocketEvents.EXECUTION_RESULT, handleExecutionResult);
    socket.on(SocketEvents.EXECUTION_ERROR, handleExecutionError);
    socket.on(SocketEvents.HINT_PENDING, handleHintPending);
    socket.on(SocketEvents.HINT_CHUNK, handleHintChunk);
    socket.on(SocketEvents.HINT_DONE, handleHintDone);
    socket.on(SocketEvents.HINT_DENIED, handleHintDenied);
    socket.on(SocketEvents.EVENT_REJECTED, handleEventRejected);
    socket.on(SocketEvents.PROBLEM_LOADED, handleProblemLoaded);
    socket.on(SocketEvents.PROBLEM_ERROR, handleProblemError);
    socket.on(SocketEvents.PROBLEM_IMPORT_STATUS, handleImportStatus);
    socket.on(SocketEvents.HINT_ERROR, handleHintError);
    socket.on(SocketEvents.TESTCASE_ADDED, handleTestcaseAdded);
    socket.on(SocketEvents.TESTCASE_ERROR, handleTestcaseError);
    socket.on(SocketEvents.SOLUTION_REVEALED, handleSolutionRevealed);

    if (socket.connected) {
      emitJoin();
    }

    return () => {
      socket.off("connect", emitJoin);
      socket.off("disconnect", clearJoinMarker);
      socket.off(SocketEvents.USER_JOINED, handleUserJoined);
      socket.off(SocketEvents.USER_LEFT, handleUserLeft);
      socket.off(SocketEvents.ROOM_SYNC, handleRoomSync);
      socket.off(SocketEvents.EXECUTION_STARTED, handleExecutionStarted);
      socket.off(SocketEvents.EXECUTION_RESULT, handleExecutionResult);
      socket.off(SocketEvents.EXECUTION_ERROR, handleExecutionError);
      socket.off(SocketEvents.HINT_PENDING, handleHintPending);
      socket.off(SocketEvents.HINT_CHUNK, handleHintChunk);
      socket.off(SocketEvents.HINT_DONE, handleHintDone);
      socket.off(SocketEvents.HINT_DENIED, handleHintDenied);
      socket.off(SocketEvents.EVENT_REJECTED, handleEventRejected);
      socket.off(SocketEvents.PROBLEM_LOADED, handleProblemLoaded);
      socket.off(SocketEvents.PROBLEM_ERROR, handleProblemError);
      socket.off(SocketEvents.PROBLEM_IMPORT_STATUS, handleImportStatus);
      socket.off(SocketEvents.HINT_ERROR, handleHintError);
      socket.off(SocketEvents.TESTCASE_ADDED, handleTestcaseAdded);
      socket.off(SocketEvents.TESTCASE_ERROR, handleTestcaseError);
      socket.off(SocketEvents.SOLUTION_REVEALED, handleSolutionRevealed);
    };
  }, [socket]);

  return <RoomContext value={{ state, dispatch }}>{children}</RoomContext>;
}
