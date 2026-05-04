import { SocketEvents } from "@codeshare/shared";
import type { Socket } from "socket.io-client";
import { createLoadSocket, type TimedSocket, waitForEvent } from "./socket-client.js";
import { createLoadYjsClient, type LoadYjsClient } from "./yjs-client.js";

export interface RoomParticipant {
  socket: Socket;
  timedSocket: TimedSocket;
  yjsClient: LoadYjsClient | null;
  userId: string;
  reconnectToken: string;
  yjsToken: string;
  roomCode: string;
}

interface JoinOptions {
  withYjs?: boolean;
  reconnectToken?: string;
}

export async function createLoadRoom(
  serverUrl: string,
  mode: "collaboration" | "interview" = "collaboration",
  displayName = "LoadUser",
): Promise<string> {
  const res = await fetch(`${serverUrl}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, displayName }),
  });
  if (!res.ok) {
    throw new Error(`Room creation failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { roomCode: string };
  return body.roomCode;
}

export async function joinLoadRoom(
  serverUrl: string,
  roomCode: string,
  displayName: string,
  opts: JoinOptions & { withYjs: true },
): Promise<RoomParticipant & { yjsClient: LoadYjsClient }>;
export async function joinLoadRoom(
  serverUrl: string,
  roomCode: string,
  displayName: string,
  opts?: JoinOptions,
): Promise<RoomParticipant>;
export async function joinLoadRoom(
  serverUrl: string,
  roomCode: string,
  displayName: string,
  opts: JoinOptions = {},
): Promise<RoomParticipant> {
  const timedSocket = await createLoadSocket(serverUrl, roomCode);
  const { socket } = timedSocket;

  const joinedPromise = waitForEvent<{
    userId: string;
    reconnectToken: string;
    yjsToken: string;
  }>(socket, SocketEvents.USER_JOINED);

  const syncPromise = waitForEvent(socket, SocketEvents.ROOM_SYNC);

  socket.emit(SocketEvents.USER_JOIN, {
    displayName,
    reconnectToken: opts.reconnectToken,
  });

  const [joined] = await Promise.all([joinedPromise, syncPromise]);
  const { userId, reconnectToken, yjsToken } = joined.data;

  let yjsClient: LoadYjsClient | null = null;
  if (opts.withYjs && yjsToken) {
    yjsClient = await createLoadYjsClient(serverUrl, roomCode, yjsToken);
  }

  return {
    socket,
    timedSocket,
    yjsClient,
    userId,
    reconnectToken,
    yjsToken,
    roomCode,
  };
}

export function disconnectParticipant(participant: RoomParticipant): void {
  participant.yjsClient?.close();
  participant.socket.disconnect();
}

export async function selectProblem(
  socket: Socket,
  problemId: string,
  timeoutMs = 10_000,
): Promise<void> {
  const loadedPromise = waitForEvent(socket, SocketEvents.PROBLEM_LOADED, timeoutMs);
  socket.emit(SocketEvents.PROBLEM_SELECT, { problemId });
  await loadedPromise;
}
