import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("../pool.js", () => ({
  pool: {
    query: mockQuery,
  },
}));

import { problemRepository } from "../repositories/problemRepository.js";

describe("problemRepository deletion helpers", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it("softDeleteById updates deleted_at instead of deleting the row", async () => {
    await problemRepository.softDeleteById("problem-1");

    expect(mockQuery).toHaveBeenCalledWith("UPDATE problems SET deleted_at = NOW() WHERE id = $1", [
      "problem-1",
    ]);
  });

  it("deleteById still hard deletes rollback rows", async () => {
    await problemRepository.deleteById("problem-1");

    expect(mockQuery).toHaveBeenCalledWith("DELETE FROM problems WHERE id = $1", ["problem-1"]);
  });
});
