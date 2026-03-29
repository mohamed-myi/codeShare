import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockBrowserLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const mockUseRoom = vi.hoisted(() => vi.fn());
const providerInstances = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const MockWebsocketProvider = vi.hoisted(
  () =>
    class {
      static OPEN = 1;
      readonly destroy = vi.fn();
      private readonly listeners = new Map<string, Array<(payload?: unknown) => void>>();

      constructor(
        readonly url: string,
        readonly roomCode: string,
        readonly doc: unknown,
        readonly options: { params: { token: string } },
      ) {
        providerInstances.push(this as unknown as Record<string, unknown>);
      }

      on(event: string, handler: (payload?: unknown) => void) {
        const eventListeners = this.listeners.get(event) ?? [];
        eventListeners.push(handler);
        this.listeners.set(event, eventListeners);
      }

      off(event: string, handler: (payload?: unknown) => void) {
        const eventListeners = this.listeners.get(event) ?? [];
        this.listeners.set(
          event,
          eventListeners.filter((listener) => listener !== handler),
        );
      }

      emit(event: string, payload?: unknown) {
        for (const listener of this.listeners.get(event) ?? []) {
          listener(payload);
        }
      }
    },
);

vi.mock("../lib/logger.ts", () => ({
  getBrowserLogger: () => mockBrowserLogger,
}));

vi.mock("../hooks/useRoom.ts", () => ({
  useRoom: () => mockUseRoom(),
}));

vi.mock("y-websocket", () => ({
  WebsocketProvider: MockWebsocketProvider,
}));

vi.mock("../lib/realtimeUrl.ts", () => ({
  getRealtimeWsBase: () => "ws://localhost:3001",
}));

import { YjsProvider } from "../providers/YjsProvider.tsx";

function renderWithRoute(children: ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/room/abc-xyz/session"]}>
      <Routes>
        <Route path="/room/:roomCode/session" element={children} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("YjsProvider", () => {
  afterEach(() => {
    sessionStorage.clear();
    mockUseRoom.mockReset();
    mockBrowserLogger.info.mockReset();
    mockBrowserLogger.warn.mockReset();
    mockBrowserLogger.error.mockReset();
    providerInstances.splice(0, providerInstances.length);
  });

  it("logs when the current user is missing a Yjs token", () => {
    mockUseRoom.mockReturnValue({ state: { currentUserId: "user-1" } });

    renderWithRoute(<YjsProvider>child</YjsProvider>);

    expect(providerInstances).toHaveLength(0);
    expect(mockBrowserLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "client_yjs_token_missing",
        roomCode: "abc-xyz",
      }),
    );
  });

  it("logs Yjs connection lifecycle transitions", async () => {
    sessionStorage.setItem("yjsToken", "yjs-token-1");
    mockUseRoom.mockReturnValue({ state: { currentUserId: "user-1" } });

    renderWithRoute(<YjsProvider>child</YjsProvider>);

    expect(providerInstances).toHaveLength(1);
    expect(mockBrowserLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "client_yjs_connect_started",
        roomCode: "abc-xyz",
      }),
    );

    providerInstances[0].emit("status", { status: "connected" });
    providerInstances[0].emit("status", { status: "disconnected" });
    providerInstances[0].emit("connection-error", new Error("WebSocket rejected"));

    await waitFor(() => {
      expect(mockBrowserLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client_yjs_connected",
          roomCode: "abc-xyz",
        }),
      );
      expect(mockBrowserLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client_yjs_disconnected",
          roomCode: "abc-xyz",
        }),
      );
      expect(mockBrowserLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "client_yjs_connection_failed",
          error: expect.objectContaining({ message: "WebSocket rejected" }),
          roomCode: "abc-xyz",
        }),
      );
    });
  });
});
