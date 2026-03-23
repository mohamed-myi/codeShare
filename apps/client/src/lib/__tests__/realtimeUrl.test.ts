import { describe, expect, it, vi } from "vitest";
import { getRealtimeHttpBase, getRealtimeWsBase } from "../realtimeUrl.ts";

describe("realtimeUrl", () => {
  it("falls back to the current origin when no override is present", () => {
    vi.stubEnv("VITE_REALTIME_URL", "");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL("http://127.0.0.1:5173/"),
    });

    expect(getRealtimeHttpBase()).toBe("http://127.0.0.1:5173");
    expect(getRealtimeWsBase()).toBe("ws://127.0.0.1:5173");
  });

  it("uses the configured realtime base URL when provided", () => {
    vi.stubEnv("VITE_REALTIME_URL", "https://codeshare.example.com/");

    expect(getRealtimeHttpBase()).toBe("https://codeshare.example.com");
    expect(getRealtimeWsBase()).toBe("wss://codeshare.example.com");
  });
});
