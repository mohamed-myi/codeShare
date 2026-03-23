import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockMonacoBindingDestroy, mockMonacoBinding, mockOnMount } = vi.hoisted(() => {
  const mockMonacoBindingDestroy = vi.fn();
  const mockMonacoBinding = vi.fn(() => ({
    destroy: mockMonacoBindingDestroy,
  }));
  const mockOnMount = vi.fn();
  return { mockMonacoBindingDestroy, mockMonacoBinding, mockOnMount };
});

vi.mock("y-monaco", () => ({
  MonacoBinding: mockMonacoBinding,
}));

vi.mock("@monaco-editor/react", () => ({
  default: (props: { onMount?: (editor: unknown) => void; options?: { readOnly?: boolean } }) => {
    if (props.onMount) mockOnMount.mockImplementation(props.onMount);
    return (
      <div data-testid="mock-editor" data-readonly={String(props.options?.readOnly ?? false)} />
    );
  },
}));

const mockYjsContext = vi.hoisted(() => ({
  doc: null as unknown,
  provider: null as unknown,
}));

vi.mock("../providers/YjsProvider.tsx", () => ({
  useYjsContext: () => mockYjsContext,
}));

import { CodeEditor } from "../components/CodeEditor.tsx";

afterEach(() => {
  mockMonacoBinding.mockClear();
  mockMonacoBindingDestroy.mockClear();
  mockOnMount.mockReset();
  mockYjsContext.doc = null;
  mockYjsContext.provider = null;
});

describe("CodeEditor", () => {
  it("renders in read-only mode when doc is null", () => {
    mockYjsContext.doc = null;

    render(<CodeEditor />);

    const editor = screen.getByTestId("mock-editor");
    expect(editor.dataset.readonly).toBe("true");
  });

  it("renders in read-only mode when explicitly disabled by room state", () => {
    mockYjsContext.doc = {
      getText: vi.fn(() => "ytext-object"),
    };

    render(<CodeEditor readOnly={true} />);

    const editor = screen.getByTestId("mock-editor");
    expect(editor.dataset.readonly).toBe("true");
  });

  it("shows reconnecting overlay when disconnected", () => {
    mockYjsContext.doc = null;
    render(<CodeEditor connected={false} />);
    expect(screen.getByTestId("editor-reconnecting-overlay")).toBeDefined();
    expect(screen.getByText("Reconnecting...")).toBeDefined();
  });

  it("does not show reconnecting overlay when connected", () => {
    mockYjsContext.doc = null;
    render(<CodeEditor connected={true} />);
    expect(screen.queryByTestId("editor-reconnecting-overlay")).toBeNull();
  });

  it("creates MonacoBinding when doc and editor are both available", async () => {
    const mockDoc = {
      getText: vi.fn(() => "ytext-object"),
    };
    const mockProvider = {
      awareness: "awareness-object",
    };
    mockYjsContext.doc = mockDoc;
    mockYjsContext.provider = mockProvider;

    render(<CodeEditor />);

    // Simulate editor mount
    const mockEditor = {
      getModel: vi.fn(() => "editor-model"),
    };
    await act(async () => {
      if (mockOnMount.getMockImplementation()) {
        mockOnMount.getMockImplementation()?.(mockEditor);
      }
    });

    expect(mockDoc.getText).toHaveBeenCalledWith("monaco");
    expect(mockMonacoBinding).toHaveBeenCalledWith(
      "ytext-object",
      "editor-model",
      expect.any(Set),
      "awareness-object",
    );
  });
});
