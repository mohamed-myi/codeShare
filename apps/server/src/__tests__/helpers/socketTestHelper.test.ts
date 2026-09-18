import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForEvent } from "./socketTestHelper.js";

afterEach(() => vi.useRealTimers());

describe("socket event waits", () => {
  it("waits through intermediate statuses until the requested result", async () => {
    vi.useFakeTimers();
    const socket = new EventEmitter();
    const result = waitForEvent<{ status: string }>(socket, "status", {
      accept: (value) => value.status !== "scraping",
    });
    socket.emit("status", { status: "scraping" });
    socket.emit("status", { status: "saved" });
    await expect(result).resolves.toEqual({ status: "saved" });
    expect(socket.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("captures an immediate event and releases its timer", async () => {
    vi.useFakeTimers();
    const socket = new EventEmitter();
    const result = waitForEvent<{ id: string }>(socket, "joined");
    socket.emit("joined", { id: "alice" });
    await expect(result).resolves.toEqual({ id: "alice" });
    expect(socket.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps concurrent waits independent until their delayed events arrive", async () => {
    vi.useFakeTimers();
    const socket = new EventEmitter();
    const joined = waitForEvent(socket, "joined");
    const synced = waitForEvent(socket, "synced");
    setTimeout(() => socket.emit("joined", "alice"), 10);
    setTimeout(() => socket.emit("synced", "room"), 20);
    await vi.advanceTimersByTimeAsync(20);
    await expect(Promise.all([joined, synced])).resolves.toEqual(["alice", "room"]);
    expect(socket.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    "disconnect",
    "connect_error",
  ])("rejects promptly on %s and releases all listeners", async (event) => {
    vi.useFakeTimers();
    const socket = new EventEmitter();
    const result = waitForEvent(socket, "joined");
    const rejection = expect(result).rejects.toThrow(/connection lost/i);
    socket.emit(event, new Error("connection lost"));
    await vi.advanceTimersByTimeAsync(3000);
    await rejection;
    expect(socket.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("allows disconnect itself to be the expected event", async () => {
    const socket = new EventEmitter();
    const result = waitForEvent(socket, "disconnect");
    socket.emit("disconnect", "server shutdown");
    await expect(result).resolves.toBe("server shutdown");
    expect(socket.eventNames()).toEqual([]);
  });

  it("removes its listener when an event never arrives", async () => {
    vi.useFakeTimers();
    const socket = new EventEmitter();
    const result = waitForEvent(socket, "joined", 50);
    const rejection = expect(result).rejects.toThrow('Timed out waiting for event "joined"');

    await vi.advanceTimersByTimeAsync(50);
    await rejection;

    expect(socket.listenerCount("joined")).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
