import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MonacoBinding } from "y-monaco";
import { useYjsContext } from "../providers/YjsProvider.tsx";

interface CodeEditorProps {
  readOnly?: boolean;
}

declare global {
  interface Window {
    __codeshareEditor?: {
      getValue(): string;
      setValue(value: string): void;
    };
  }
}

const handleBeforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("codeshare-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "93C5FD" },
      { token: "string", foreground: "86EFAC" },
      { token: "function", foreground: "7DD3FC" },
      { token: "comment", foreground: "6B7280", fontStyle: "italic" },
      { token: "number", foreground: "CBD5E1" },
      { token: "operator", foreground: "9BA3AF" },
      { token: "type", foreground: "7DD3FC" },
      { token: "variable", foreground: "E6EDF3" },
    ],
    colors: {
      "editor.background": "#0D0F12",
      "editor.foreground": "#E6EDF3",
      "editorCursor.foreground": "#2563EB",
      "editor.selectionBackground": "rgba(37,99,235,0.2)",
      "editor.lineHighlightBackground": "#171B21",
      "editorLineNumber.foreground": "#6B7280",
      "editorLineNumber.activeForeground": "#9BA3AF",
      "editorGutter.background": "#0D0F12",
      "editorWidget.background": "#12151A",
      "editorWidget.border": "rgba(255,255,255,0.06)",
      "input.background": "#12151A",
      "input.border": "rgba(255,255,255,0.12)",
      "scrollbar.shadow": "#00000000",
      "editorScrollbar.background": "#0D0F1200",
    },
  });
};

export function CodeEditor({ readOnly = false }: CodeEditorProps) {
  const { doc, provider } = useYjsContext();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    window.__codeshareEditor = {
      getValue: () => editor.getValue(),
      setValue: (value: string) => editor.setValue(value),
    };
    setMounted(true);
  };

  const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
  }, []);

  useEffect(() => {
    if (!doc || !editorRef.current || !mounted) return;

    const ytext = doc.getText("monaco");
    const model = editorRef.current.getModel();
    if (!model) return;
    const binding = new MonacoBinding(
      ytext,
      model,
      new Set([editorRef.current]),
      provider?.awareness,
    );

    return () => {
      binding.destroy();
    };
  }, [doc, provider, mounted]);

  useEffect(() => {
    return () => {
      delete window.__codeshareEditor;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const editor = editorRef.current;
    if (!container || !editor) return;

    const observer = new ResizeObserver(() => {
      editor.layout();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRefCallback} className="h-full w-full" data-testid="code-editor">
      <Editor
        height="100%"
        language="python"
        theme="codeshare-dark"
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          tabSize: 4,
          readOnly: readOnly || !doc,
          padding: { top: 16 },
          cursorBlinking: "smooth",
          smoothScrolling: true,
        }}
      />
    </div>
  );
}
