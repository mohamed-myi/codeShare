import { describe, expect, it, vi } from "vitest";

describe("test network boundary", () => {
  it("serves explicitly mocked requests", async () => {
    const response = await fetch("http://localhost/api/access/session");
    expect(await response.json()).toEqual({ authenticated: true });
  });

  it("rejects unexpected requests before reaching the network", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(fetch("http://127.0.0.1:1/unmocked")).rejects.toThrow(
        /\[MSW\].*"error".*"onUnhandledRequest"/,
      );
    } finally {
      errorLog.mockRestore();
    }
  });
});
