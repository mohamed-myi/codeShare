import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import type { Room } from "../models/Room.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
}

/**
 * Generic factory for creating handler session objects.
 *
 * This function centralizes the common pattern of:
 * 1. Extracting room code from socket data
 * 2. Looking up the room
 * 3. Returning null if room not found
 * 4. Building a session object with custom context
 *
 * @param socket - Socket connection
 * @param io - Socket.IO server instance
 * @param logger - Logger instance
 * @param roomLookup - Room lookup service
 * @param buildContext - Function to build custom session fields
 * @param validateRoom - Optional function to validate room (e.g., check problemId exists)
 * @returns Session object or null if room not found or invalid
 */
export function createHandlerSession<T>(
  socket: Socket,
  _io: Server,
  _logger: Logger,
  roomLookup: RoomLookup,
  buildContext: () => T,
  validateRoom?: (room: Room) => boolean,
): (T & { room: Room; roomCode: string }) | null {
  const roomCode = socket.data.roomCode as string;
  const room = roomLookup.getRoom(roomCode);

  if (!room) {
    return null;
  }

  if (validateRoom && !validateRoom(room)) {
    return null;
  }

  return { ...buildContext(), room, roomCode };
}
