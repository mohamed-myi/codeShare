import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocketProvider, useSocketContext } from "../providers/SocketProvider.tsx";

const mockIo = vi.fn();
const mockBrowserLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
const mockGetBrowserLogger = vi.hoisted(() => vi.fn(() => mockBrowserLogger));
vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

vi.mock("../lib/logger.ts", () => ({
  getBrowserLogger: (...args: unknown[]) => mockGetBrowserLogger(...args),
}));

vi.mock("../lib/realtimeUrl.ts", () => ({
  getRealtimeHttpBase: () => "http://localhost:3001",
}));

function TestConsumer() {
  const { socket, connected, connectionError } = useSocketContext();
  return (
    <div>
      <span data-testid="connected">{String(connected)}</span>
      <span data-testid="hasSocket">{String(socket !== null)}</span>
      <span data-testid="connectionError">{connectionError ?? ""}</span>
    </div>
  );
}

function createMockSocket() {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  return {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)?.push(cb);
    }),
    off: vi.fn(),
    disconnect: vi.fn(),
    _trigger: (event: string, ...args: unknown[]) => {
      for (const cb of listeners.get(event) ?? []) cb(...args);
    },
  };
}

afterEach(() => {
  mockIo.mockReset();
  mockGetBrowserLogger.mockReset();
  mockGetBrowserLogger.mockImplementation(() => mockBrowserLogger);
  mockBrowserLogger.info.mockReset();
  mockBrowserLogger.warn.mockReset();
  mockBrowserLogger.error.mockReset();
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
      expect.any(String),
      expect.objectContaining({
        query: { roomCode: "abc-xyz" },
      }),
    );
    expect(mockGetBrowserLogger).toHaveBeenCalledWith();
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

  it("surfaces connect errors and clears them after reconnect", async () => {
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

    mockSocket._trigger("connect_error", new Error("Origin not allowed"));
    await waitFor(() => {
      expect(screen.getByTestId("connected").textContent).toBe("false");
      expect(screen.getByTestId("connectionError").textContent).toBe("Origin not allowed");
    });

    mockSocket._trigger("connect");
    await waitFor(() => {
      expect(screen.getByTestId("connected").textContent).toBe("true");
      expect(screen.getByTestId("connectionError").textContent).toBe("");
    });
  });
});
