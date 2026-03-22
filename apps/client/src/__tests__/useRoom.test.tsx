import { SocketEvents } from "@codeshare/shared";
import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockSocket = vi.hoisted(() => {
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
        eventListeners.filter((c) => c !== handler),
      );
    }),
    trigger(event: string, payload?: unknown) {
      if (event === "connect") this.connected = true;
      if (event === "disconnect") this.connected = false;
      for (const listener of listeners.get(event) ?? []) listener(payload);
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
});

vi.mock("../hooks/useSocket.ts", () => ({
  useSocket: () => ({ socket: mockSocket, connected: mockSocket.connected }),
}));

import { useRoom } from "../hooks/useRoom.ts";
import { RoomProvider } from "../providers/RoomProvider.tsx";

function TestHarness() {
  const { state } = useRoom();

  return (
    <div>
      <span data-testid="current-user-id">{state.currentUserId ?? ""}</span>
      <span data-testid="user-count">{state.users.length}</span>
    </div>
  );
}

function renderWithRoomProvider(ui: React.ReactNode) {
  return render(<RoomProvider>{ui}</RoomProvider>);
}

afterEach(() => {
  sessionStorage.clear();
  mockSocket.reset();
});

describe("useRoom", () => {
  it("emits user:join immediately when the socket is already connected", () => {
    sessionStorage.setItem("displayName", "Alice");
    sessionStorage.setItem("reconnectToken", "token-123");
    mockSocket.connected = true;

    renderWithRoomProvider(<TestHarness />);

    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.USER_JOIN, {
      displayName: "Alice",
      reconnectToken: "token-123",
    });
  });

  it("emits user:join only once when multiple consumers mount under StrictMode", () => {
    sessionStorage.setItem("displayName", "Alice");
    sessionStorage.setItem("reconnectToken", "token-123");
    mockSocket.connected = true;

    render(
      <StrictMode>
        <RoomProvider>
          <TestHarness />
          <TestHarness />
        </RoomProvider>
      </StrictMode>,
    );

    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.USER_JOIN, {
      displayName: "Alice",
      reconnectToken: "token-123",
    });
  });

  it("emits user:join on socket connect using stored display name and reconnect token", () => {
    sessionStorage.setItem("displayName", "Alice");
    sessionStorage.setItem("reconnectToken", "token-123");

    renderWithRoomProvider(<TestHarness />);

    act(() => {
      mockSocket.trigger("connect");
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.USER_JOIN, {
      displayName: "Alice",
      reconnectToken: "token-123",
    });
  });

  it("stores reconnect token and current user id from the local user:joined payload", () => {
    renderWithRoomProvider(<TestHarness />);

    act(() => {
      mockSocket.trigger(SocketEvents.USER_JOINED, {
        userId: "user-1",
        displayName: "Alice",
        role: "peer",
        mode: "collaboration",
        reconnectToken: "fresh-token",
        yjsToken: "yjs-token-1",
      });
    });

    expect(sessionStorage.getItem("reconnectToken")).toBe("fresh-token");
    expect(sessionStorage.getItem("yjsToken")).toBe("yjs-token-1");
    expect(screen.getByTestId("current-user-id").textContent).toBe("user-1");
    expect(screen.getByTestId("user-count").textContent).toBe("1");
  });

  it("does not overwrite the local reconnect token when another user joins", () => {
    renderWithRoomProvider(<TestHarness />);

    act(() => {
      mockSocket.trigger(SocketEvents.USER_JOINED, {
        userId: "user-1",
        displayName: "Alice",
        role: "peer",
        mode: "collaboration",
        reconnectToken: "fresh-token",
        yjsToken: "yjs-token-1",
      });
      mockSocket.trigger(SocketEvents.USER_JOINED, {
        userId: "user-2",
        displayName: "Bob",
        role: "peer",
        mode: "collaboration",
        reconnectToken: "",
        yjsToken: "",
      });
    });

    expect(sessionStorage.getItem("reconnectToken")).toBe("fresh-token");
    expect(sessionStorage.getItem("yjsToken")).toBe("yjs-token-1");
    expect(screen.getByTestId("current-user-id").textContent).toBe("user-1");
    expect(screen.getByTestId("user-count").textContent).toBe("2");
  });
});
