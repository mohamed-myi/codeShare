import { useReducer, useEffect } from "react";
import { SocketEvents } from "@codeshare/shared";
import { roomReducer, initialRoomState } from "../reducers/roomReducer.ts";
import { useSocket } from "./useSocket.ts";

export function useRoom() {
  const { socket } = useSocket();
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);

  useEffect(() => {
    if (!socket) return;

    socket.on(SocketEvents.USER_JOINED, (payload) =>
      dispatch({ type: "USER_JOINED", payload }),
    );
    socket.on(SocketEvents.USER_LEFT, (payload) =>
      dispatch({ type: "USER_LEFT", payload }),
    );
    socket.on(SocketEvents.ROOM_SYNC, (payload) =>
      dispatch({ type: "ROOM_SYNC", payload }),
    );
    socket.on(SocketEvents.EXECUTION_STARTED, (payload) =>
      dispatch({ type: "EXECUTION_STARTED", payload }),
    );
    socket.on(SocketEvents.EXECUTION_RESULT, (payload) =>
      dispatch({ type: "EXECUTION_RESULT", payload }),
    );
    socket.on(SocketEvents.EXECUTION_ERROR, (payload) =>
      dispatch({ type: "EXECUTION_ERROR", payload }),
    );
    socket.on(SocketEvents.HINT_PENDING, (payload) =>
      dispatch({ type: "HINT_PENDING", payload }),
    );
    socket.on(SocketEvents.HINT_CHUNK, (payload) =>
      dispatch({ type: "HINT_CHUNK", payload }),
    );
    socket.on(SocketEvents.HINT_DONE, (payload) =>
      dispatch({ type: "HINT_DONE", payload }),
    );
    socket.on(SocketEvents.HINT_DENIED, () =>
      dispatch({ type: "HINT_DENIED" }),
    );
    socket.on(SocketEvents.EVENT_REJECTED, (payload) =>
      dispatch({ type: "EVENT_REJECTED", payload }),
    );

    return () => {
      socket.off(SocketEvents.USER_JOINED);
      socket.off(SocketEvents.USER_LEFT);
      socket.off(SocketEvents.ROOM_SYNC);
      socket.off(SocketEvents.EXECUTION_STARTED);
      socket.off(SocketEvents.EXECUTION_RESULT);
      socket.off(SocketEvents.EXECUTION_ERROR);
      socket.off(SocketEvents.HINT_PENDING);
      socket.off(SocketEvents.HINT_CHUNK);
      socket.off(SocketEvents.HINT_DONE);
      socket.off(SocketEvents.HINT_DENIED);
      socket.off(SocketEvents.EVENT_REJECTED);
    };
  }, [socket]);

  return { state, dispatch };
}
