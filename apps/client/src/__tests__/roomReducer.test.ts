import { describe, it, expect } from "vitest";
import { roomReducer, initialRoomState } from "../reducers/roomReducer.ts";

describe("roomReducer", () => {
  it("handles EXECUTION_STARTED", () => {
    const next = roomReducer(initialRoomState, {
      type: "EXECUTION_STARTED",
      payload: { executionType: "run" },
    });
    expect(next.executionInProgress).toBe(true);
    expect(next.executionResult).toBeNull();
  });

  it("handles USER_LEFT by marking user disconnected", () => {
    const withUser = {
      ...initialRoomState,
      users: [
        { id: "u1", displayName: "Alice", role: "peer" as const, connected: true },
      ],
    };
    const next = roomReducer(withUser, {
      type: "USER_LEFT",
      payload: { userId: "u1" },
    });
    expect(next.users[0].connected).toBe(false);
  });
});
