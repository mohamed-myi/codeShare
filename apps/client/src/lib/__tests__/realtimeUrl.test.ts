import { describe, expect, it, vi } from "vitest";
import { getRealtimeHttpBase, getRealtimeWsBase } from "../realtimeUrl.ts";

describe("realtimeUrl", () => {
  it("derives the backend port from the dev origin when no override is present", () => {
    vi.stubEnv("VITE_REALTIME_URL", "");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL("http://127.0.0.1:5173/"),
    });

    expect(getRealtimeHttpBase()).toBe("http://127.0.0.1:3001");
    expect(getRealtimeWsBase()).toBe("ws://127.0.0.1:3001");
  });

  it("maps LAN dev origins to the backend port", () => {
    vi.stubEnv("VITE_REALTIME_URL", "");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL("http://192.168.1.238:5173/"),
    });

    expect(getRealtimeHttpBase()).toBe("http://192.168.1.238:3001");
    expect(getRealtimeWsBase()).toBe("ws://192.168.1.238:3001");
  });

  it("keeps non-dev ports on the current origin", () => {
    vi.stubEnv("VITE_REALTIME_URL", "");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL("https://codeshare.example.com/"),
    });

    expect(getRealtimeHttpBase()).toBe("https://codeshare.example.com");
    expect(getRealtimeWsBase()).toBe("wss://codeshare.example.com");
  });

  it("uses the configured realtime base URL when provided", () => {
    vi.stubEnv("VITE_REALTIME_URL", "https://codeshare.example.com/");

    expect(getRealtimeHttpBase()).toBe("https://codeshare.example.com");
    expect(getRealtimeWsBase()).toBe("wss://codeshare.example.com");
  });
});
