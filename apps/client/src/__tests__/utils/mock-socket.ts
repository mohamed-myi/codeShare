import { vi } from "vitest";

export function createMockSocket() {
  const listeners = new Map<string, Array<(payload?: unknown) => void>>();

  return {
    connected: false,
    id: "socket-1",
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      const eventListeners = listeners.get(event) ?? [];
      eventListeners.push(handler);
      listeners.set(event, eventListeners);
    }),
    off: vi.fn((event: string, handler?: (payload?: unknown) => void) => {
      if (!handler) {
        listeners.delete(event);
        return;
      }

      const eventListeners = listeners.get(event) ?? [];
      listeners.set(
        event,
        eventListeners.filter((candidate) => candidate !== handler),
      );
    }),
    trigger(event: string, payload?: unknown) {
      if (event === "connect") {
        this.connected = true;
      }
      if (event === "disconnect") {
        this.connected = false;
      }
      for (const listener of listeners.get(event) ?? []) {
        listener(payload);
      }
    },
    reset() {
      this.connected = false;
      this.id = "socket-1";
      delete (this as Record<string, unknown>).__codeshareJoinedSocketId;
      this.emit.mockReset();
      this.on.mockClear();
      this.off.mockClear();
      listeners.clear();
    },
  };
}
