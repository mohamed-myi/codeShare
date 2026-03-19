import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SocketProvider, useSocketContext } from "../providers/SocketProvider.tsx";

const mockIo = vi.fn();
vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

function TestConsumer() {
  const { socket, connected } = useSocketContext();
  return (
    <div>
      <span data-testid="connected">{String(connected)}</span>
      <span data-testid="hasSocket">{String(socket !== null)}</span>
    </div>
  );
}

function createMockSocket() {
  const listeners = new Map<string, (() => void)[]>();
  return {
    on: vi.fn((event: string, cb: () => void) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(cb);
    }),
    off: vi.fn(),
    disconnect: vi.fn(),
    _trigger: (event: string) => {
      for (const cb of listeners.get(event) ?? []) cb();
    },
  };
}

afterEach(() => {
  cleanup();
  mockIo.mockReset();
});

describe("SocketProvider", () => {
  it("passes roomCode from URL params as query to io()", () => {
    const mockSocket = createMockSocket();
    mockIo.mockReturnValue(mockSocket);

    render(
      <MemoryRouter initialEntries={["/room/abc-xyz/session"]}>
        <Routes>
          <Route
            path="/room/:roomCode/session"
            element={
              <SocketProvider>
                <TestConsumer />
              </SocketProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockIo).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { roomCode: "abc-xyz" },
      }),
    );
  });

  it("does not create socket when roomCode is undefined", () => {
    render(
      <MemoryRouter initialEntries={["/no-room-code"]}>
        <Routes>
          <Route
            path="/no-room-code"
            element={
              <SocketProvider>
                <TestConsumer />
              </SocketProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockIo).not.toHaveBeenCalled();
    expect(screen.getByTestId("hasSocket").textContent).toBe("false");
  });
});
