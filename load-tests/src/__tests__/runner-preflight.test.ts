import { afterEach, describe, expect, it, vi } from "vitest";

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../lib/logger.js", () => ({
  createLoadTestLogger: () => mockLogger,
  getLoadTestLogger: () => mockLogger,
}));

import { resetTestStateIfAvailable, validateProblemData } from "../lib/health-client.js";
import { selectedScenariosRequireProblemData } from "../lib/preflight.js";
import { scenarios, selectScenarios } from "../scenarios/index.js";

describe("validateProblemData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
  });

  it("resolves when the problem catalog has entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          problems: [{ id: "problem-1" }],
        }),
      }),
    );

    await expect(validateProblemData("http://127.0.0.1:3099")).resolves.toBeUndefined();
  });

  it("throws a clear error when the catalog request returns non-ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    await expect(validateProblemData("http://127.0.0.1:3099")).rejects.toThrow(
      "Problem catalog returned 500",
    );
  });

  it("throws a clear error when the catalog is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          problems: [],
        }),
      }),
    );

    await expect(validateProblemData("http://127.0.0.1:3099")).rejects.toThrow(
      "No problems in database",
    );
  });

  it("throws a clear error on network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    await expect(validateProblemData("http://127.0.0.1:3099")).rejects.toThrow(
      "Cannot reach problem catalog",
    );
  });
});

describe("resetTestStateIfAvailable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
  });

  it("returns true when the test reset route succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );

    await expect(resetTestStateIfAvailable("http://127.0.0.1:3099")).resolves.toBe(true);
  });

  it("returns false and warns when the reset route is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    await expect(resetTestStateIfAvailable("http://127.0.0.1:3099")).resolves.toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "load_test_test_reset_unavailable",
      expect.objectContaining({
        server_url: "http://127.0.0.1:3099",
        status_code: 404,
      }),
    );
  });

  it("throws on unexpected reset failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    await expect(resetTestStateIfAvailable("http://127.0.0.1:3099")).rejects.toThrow(
      "Test reset failed: 500",
    );
  });
});

describe("selectedScenariosRequireProblemData", () => {
  it("returns false for the smoke selection", () => {
    const selected = selectScenarios(scenarios, ["LT-2", "LT-3"]);
    expect(selectedScenariosRequireProblemData(selected)).toBe(false);
  });

  it("returns true when any selected scenario requires seeded problems", () => {
    const selected = selectScenarios(scenarios, ["LT-4", "LT-8"]);
    expect(selectedScenariosRequireProblemData(selected)).toBe(true);
  });
});
