import type { ProblemListItem, RoomInfoResponse } from "@codeshare/shared";
import { HttpResponse, http } from "msw";

const defaultProblems: ProblemListItem[] = [
  { id: "p1", slug: "two-sum", title: "Two Sum", difficulty: "easy", category: "Arrays & Hashing" },
  {
    id: "p2",
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    category: "Stack",
  },
];

const defaultRoomInfo: RoomInfoResponse = {
  exists: true,
  mode: "collaboration",
  userCount: 1,
  maxUsers: 2,
};

export const handlers = [
  http.get("*/api/problems", () => {
    return HttpResponse.json({ problems: defaultProblems });
  }),

  http.post("*/api/rooms", () => {
    return HttpResponse.json({ roomCode: "abc-xyz" });
  }),

  http.get("*/api/rooms/:roomCode", () => {
    return HttpResponse.json(defaultRoomInfo);
  }),
];
