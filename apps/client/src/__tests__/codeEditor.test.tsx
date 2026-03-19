import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

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
    mockOnMount.mockImplementation(props.onMount);
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
  cleanup();
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
    if (mockOnMount.getMockImplementation()) {
      mockOnMount.getMockImplementation()!(mockEditor);
    }

    // Wait for effects to run
    await new Promise((r) => setTimeout(r, 50));

    expect(mockDoc.getText).toHaveBeenCalledWith("monaco");
    expect(mockMonacoBinding).toHaveBeenCalledWith(
      "ytext-object",
      "editor-model",
      expect.any(Set),
      "awareness-object",
    );
  });
});
