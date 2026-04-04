import { createContext, type Dispatch, type ReactNode, useEffect, useReducer } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../hooks/useSocket.ts";
import { getBrowserLogger } from "../lib/logger.ts";
import {
  type ClientRoomState,
  initialRoomState,
  type RoomAction,
  roomReducer,
} from "../reducers/roomReducer.ts";
import {
  bindSocketHandlers,
  createRoomSocketHandlers,
  createSessionPersistFailureLogger,
  emitJoin,
} from "./roomSocketBindings.ts";

interface RoomContextValue {
  state: ClientRoomState;
  dispatch: Dispatch<RoomAction>;
}

export const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const { roomCode } = useParams<{ roomCode: string }>();
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);

  useEffect(() => {
    if (!socket) return;

    const logger = getBrowserLogger();
    const logSessionPersistFailure = createSessionPersistFailureLogger({
      logger,
      roomCode,
      socket,
    });
    const handlers = createRoomSocketHandlers({
      dispatch,
      logger,
      roomCode,
      socket,
      logSessionPersistFailure,
    });
    const unbindHandlers = bindSocketHandlers(socket, handlers);

    if (socket.connected) {
      emitJoin({ socket, roomCode, logger, logSessionPersistFailure });
    }

    return unbindHandlers;
  }, [roomCode, socket]);

  return <RoomContext value={{ state, dispatch }}>{children}</RoomContext>;
}
