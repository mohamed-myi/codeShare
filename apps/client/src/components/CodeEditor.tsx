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
      { token: "keyword", foreground: "E0D3B8" },
      { token: "string", foreground: "B9D7C8" },
      { token: "function", foreground: "C5D7EB" },
      { token: "comment", foreground: "6A6A72", fontStyle: "italic" },
      { token: "number", foreground: "D8C4B1" },
      { token: "operator", foreground: "AEAFB5" },
      { token: "type", foreground: "C5D7EB" },
      { token: "variable", foreground: "FAFAFA" },
    ],
    colors: {
      "editor.background": "#09090B",
      "editor.foreground": "#FAFAFA",
      "editorCursor.foreground": "#FAFAFA",
      "editor.selectionBackground": "rgba(255,255,255,0.12)",
      "editor.lineHighlightBackground": "#0D0D10",
      "editorLineNumber.foreground": "#5C5C63",
      "editorLineNumber.activeForeground": "#8C8C95",
      "editorGutter.background": "#09090B",
      "editorWidget.background": "#0D0D10",
      "editorWidget.border": "rgba(255,255,255,0.06)",
      "input.background": "#0D0D10",
      "input.border": "rgba(255,255,255,0.12)",
      "scrollbar.shadow": "#00000000",
      "editorScrollbar.background": "#09090B00",
    },
  });
};

export function CodeEditor({ readOnly = false }: CodeEditorProps) {
  const { doc, provider } = useYjsContext();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
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
    if (!mounted || !monacoRef.current) return;
    document.fonts.ready.then(() => {
      monacoRef.current?.editor.remeasureFonts();
    });
  }, [mounted]);

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
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          tabSize: 4,
          readOnly: readOnly || !doc,
          padding: { top: 20, bottom: 20 },
          cursorBlinking: "smooth",
          smoothScrolling: true,
          lineNumbers: "on",
          glyphMargin: false,
          folding: false,
          renderLineHighlight: "line",
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
      />
    </div>
  );
}
