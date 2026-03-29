import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockLocalStorage } from "./utils/mock-localStorage.js";

const mockBrowserLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../lib/logger.ts", () => ({
  getBrowserLogger: () => mockBrowserLogger,
}));

import { useLayoutState } from "../hooks/useLayoutState.ts";

const STORAGE_KEY = "codeshare:layout";
const { store, mock: mockStorage } = createMockLocalStorage();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", mockStorage);
  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockBrowserLogger.info.mockReset();
  mockBrowserLogger.warn.mockReset();
  mockBrowserLogger.error.mockReset();
  vi.restoreAllMocks();
});

describe("useLayoutState", () => {
  it("returns default state when localStorage is empty", () => {
    const { result } = renderHook(() => useLayoutState());

    expect(result.current.state).toEqual({
      problemCollapsed: false,
      resultsCollapsed: false,
      activeResultsTab: "testcases",
    });
  });

  it("reads persisted state from localStorage", () => {
    store.set(
      STORAGE_KEY,
      JSON.stringify({
        problemCollapsed: true,
        resultsCollapsed: false,
        activeResultsTab: "results",
      }),
    );

    const { result } = renderHook(() => useLayoutState());

    expect(result.current.state.problemCollapsed).toBe(true);
    expect(result.current.state.activeResultsTab).toBe("results");
  });

  it("toggleProblemPanel flips problemCollapsed", () => {
    const { result } = renderHook(() => useLayoutState());

    act(() => {
      result.current.toggleProblemPanel();
    });

    expect(result.current.state.problemCollapsed).toBe(true);

    act(() => {
      result.current.toggleProblemPanel();
    });

    expect(result.current.state.problemCollapsed).toBe(false);
  });

  it("toggleResultsPanel flips resultsCollapsed", () => {
    const { result } = renderHook(() => useLayoutState());

    act(() => {
      result.current.toggleResultsPanel();
    });

    expect(result.current.state.resultsCollapsed).toBe(true);
  });

  it("expandResultsPanel sets resultsCollapsed to false", () => {
    store.set(
      STORAGE_KEY,
      JSON.stringify({
        problemCollapsed: false,
        resultsCollapsed: true,
        activeResultsTab: "testcases",
      }),
    );

    const { result } = renderHook(() => useLayoutState());

    expect(result.current.state.resultsCollapsed).toBe(true);

    act(() => {
      result.current.expandResultsPanel();
    });

    expect(result.current.state.resultsCollapsed).toBe(false);
  });

  it("expandResultsPanel is a no-op when already expanded", () => {
    const { result } = renderHook(() => useLayoutState());

    const before = result.current.state;
    act(() => {
      result.current.expandResultsPanel();
    });

    expect(result.current.state).toBe(before);
  });

  it("setActiveResultsTab updates tab", () => {
    const { result } = renderHook(() => useLayoutState());

    act(() => {
      result.current.setActiveResultsTab("results");
    });

    expect(result.current.state.activeResultsTab).toBe("results");
  });

  it("persists state changes to localStorage", () => {
    const { result } = renderHook(() => useLayoutState());

    act(() => {
      result.current.toggleProblemPanel();
    });

    const raw = store.get(STORAGE_KEY);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw as string);
    expect(parsed.problemCollapsed).toBe(true);
  });

  it("handles corrupted localStorage gracefully", () => {
    store.set(STORAGE_KEY, "not-json{{{");

    const { result } = renderHook(() => useLayoutState());

    expect(result.current.state).toEqual({
      problemCollapsed: false,
      resultsCollapsed: false,
      activeResultsTab: "testcases",
    });
  });

  it("handles localStorage with wrong shape gracefully", () => {
    store.set(STORAGE_KEY, JSON.stringify({ foo: "bar" }));

    const { result } = renderHook(() => useLayoutState());

    expect(result.current.state).toEqual({
      problemCollapsed: false,
      resultsCollapsed: false,
      activeResultsTab: "testcases",
    });
  });

  it("logs localStorage read failures", () => {
    vi.spyOn(mockStorage, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    renderHook(() => useLayoutState());

    expect(mockBrowserLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "client_storage_read_failed",
        error: expect.objectContaining({ message: "storage unavailable" }),
      }),
    );
  });

  it("logs localStorage write failures", () => {
    vi.spyOn(mockStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const { result } = renderHook(() => useLayoutState());

    act(() => {
      result.current.toggleProblemPanel();
    });

    expect(mockBrowserLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "client_storage_write_failed",
        error: expect.objectContaining({ message: "quota exceeded" }),
      }),
    );
  });
});
