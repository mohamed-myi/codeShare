import { ROOM_CODE } from "@codeshare/shared";

/**
 * Generates a room code in format "abcd-efgh" using a base32-safe alphabet.
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
  return uuidFallbackSegments();
}

export function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toLowerCase();
}

function randomSegments(): string {
  const alphabet = ROOM_CODE.ALPHABET;

  const segment = (): string => {
    let s = "";
    for (let i = 0; i < ROOM_CODE.SEGMENT_LENGTH; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return s;
  };
  return `${segment()}-${segment()}`;
}

function uuidFallbackSegments(): string {
  const source = crypto.randomUUID().replaceAll("-", "");
  const alphabet = ROOM_CODE.ALPHABET;
  let letters = "";

  const targetLength = ROOM_CODE.SEGMENT_LENGTH * ROOM_CODE.SEGMENT_COUNT;
  for (let index = 0; letters.length < targetLength && index < source.length; index += 2) {
    const pair = source.slice(index, index + 2);
    letters += alphabet[parseInt(pair, 16) % alphabet.length];
  }

  return `${letters.slice(0, ROOM_CODE.SEGMENT_LENGTH)}-${letters.slice(ROOM_CODE.SEGMENT_LENGTH, targetLength)}`;
}
