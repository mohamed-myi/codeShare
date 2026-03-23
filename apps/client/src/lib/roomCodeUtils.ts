import { ROOM_CODE } from "@codeshare/shared";

const TOTAL_LENGTH = ROOM_CODE.SEGMENT_LENGTH * ROOM_CODE.SEGMENT_COUNT;

export function stripRoomCodeInput(raw: string): string {
  return raw
    .toLowerCase()
    .split("")
    .filter((ch) => ROOM_CODE.ALPHABET.includes(ch))
    .slice(0, TOTAL_LENGTH)
    .join("");
}

export function formatRoomCode(stripped: string): string {
  if (stripped.length <= ROOM_CODE.SEGMENT_LENGTH) return stripped;
  return `${stripped.slice(0, ROOM_CODE.SEGMENT_LENGTH)}-${stripped.slice(ROOM_CODE.SEGMENT_LENGTH)}`;
}

export function isRoomCodeComplete(stripped: string): boolean {
  return stripped.length === TOTAL_LENGTH;
}

export function normalizeRoomCodeInput(raw: string): string | null {
  const stripped = stripRoomCodeInput(raw);
  if (!isRoomCodeComplete(stripped)) return null;
  return formatRoomCode(stripped);
}
