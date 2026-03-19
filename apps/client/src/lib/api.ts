import type {
  ProblemListItem,
  ProblemDetail,
  RoomMode,
  RoomInfoResponse,
} from "@codeshare/shared";

const BASE = "/api";

export async function fetchProblems(filters?: {
  category?: string;
  difficulty?: string;
}): Promise<ProblemListItem[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.difficulty) params.set("difficulty", filters.difficulty);

  const url = `${BASE}/problems${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch problems: ${res.status}`);
  const data = await res.json();
  return data.problems;
}

export async function fetchProblem(id: string): Promise<ProblemDetail> {
  const res = await fetch(`${BASE}/problems/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch problem: ${res.status}`);
  return res.json();
}

export async function createRoom(
  mode: RoomMode,
): Promise<{ roomCode: string }> {
  const res = await fetch(`${BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(`Failed to create room: ${res.status}`);
  return res.json();
}

export async function checkRoom(roomCode: string): Promise<RoomInfoResponse> {
  const res = await fetch(
    `${BASE}/rooms/${encodeURIComponent(roomCode)}`,
  );
  if (!res.ok) throw new Error(`Failed to check room: ${res.status}`);
  return res.json();
}
