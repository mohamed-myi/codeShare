import type { ProblemListItem, RoomInfoResponse, RoomMode } from "@codeshare/shared";
import { CLIENT_LOG_EVENTS } from "@codeshare/shared";
import { getBrowserLogger } from "./logger.ts";

const BASE = "/api";
const logger = getBrowserLogger();

async function parseJsonResponse<T>(
  requestPath: string,
  response: Response,
  failureMessage: string,
): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  const requestId = response.headers.get("x-request-id") ?? undefined;
  await logger.error({
    event: CLIENT_LOG_EVENTS.CLIENT_API_REQUEST_FAILED,
    requestId,
    context: {
      request_path: requestPath,
      status_code: response.status,
    },
    error: new Error(`Request failed with status ${response.status}`),
  });
  throw new Error(`${failureMessage}: ${response.status}`);
}

export async function fetchProblems(filters?: {
  category?: string;
  difficulty?: string;
}): Promise<ProblemListItem[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.difficulty) params.set("difficulty", filters.difficulty);

  const url = `${BASE}/problems${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  const data = await parseJsonResponse<{ problems: ProblemListItem[] }>(
    url,
    res,
    "Failed to fetch problems",
  );
  return data.problems;
}

export async function createRoom(
  mode: RoomMode,
  displayName: string,
): Promise<{ roomCode: string }> {
  const res = await fetch(`${BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, displayName }),
  });
  return parseJsonResponse<{ roomCode: string }>(`${BASE}/rooms`, res, "Failed to create room");
}

export async function checkRoom(roomCode: string, signal?: AbortSignal): Promise<RoomInfoResponse> {
  const res = await fetch(`${BASE}/rooms/${encodeURIComponent(roomCode)}`, { signal });
  return parseJsonResponse<RoomInfoResponse>(
    `${BASE}/rooms/${encodeURIComponent(roomCode)}`,
    res,
    "Failed to check room",
  );
}
