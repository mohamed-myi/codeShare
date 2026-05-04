import { describe, expect, it, vi } from "vitest";
import { fetchFirstProblemId } from "../lib/problem-catalog.js";

describe("fetchFirstProblemId", () => {
  it("returns the first available problem id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        problems: [{ id: "problem-1" }, { id: "problem-2" }],
      }),
    });

    await expect(fetchFirstProblemId("http://127.0.0.1:3099", fetchImpl)).resolves.toBe(
      "problem-1",
    );
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:3099/api/problems");
  });

  it("throws when the problem catalog request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(fetchFirstProblemId("http://127.0.0.1:3099", fetchImpl)).rejects.toThrow(
      "Failed to fetch problems: 503",
    );
  });

  it("throws when the catalog is empty", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        problems: [],
      }),
    });

    await expect(fetchFirstProblemId("http://127.0.0.1:3099", fetchImpl)).rejects.toThrow(
      "No problems found in database",
    );
  });
});
