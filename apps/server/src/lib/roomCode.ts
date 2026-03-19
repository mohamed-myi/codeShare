import { ROOM_CODE } from "@codeshare/shared";

/**
 * Generates a room code in format "abc-xyz" (two 3-letter lowercase segments).
 * Checks for collision against active rooms, retries up to 5 times,
 * then falls back to UUID-based code.
 */
export function generateRoomCode(activeRoomCodes: Set<string>): string {
  for (let attempt = 0; attempt < ROOM_CODE.MAX_RETRIES; attempt++) {
    const code = randomSegments();
    if (!activeRoomCodes.has(code)) {
      return code;
    }
  }
  return crypto.randomUUID().slice(0, 7);
}

function randomSegments(): string {
  const segment = (): string => {
    let s = "";
    for (let i = 0; i < ROOM_CODE.SEGMENT_LENGTH; i++) {
      s += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
    return s;
  };
  return `${segment()}-${segment()}`;
}
