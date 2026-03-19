import { useRef, useEffect, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useYjsContext } from "../providers/YjsProvider.tsx";

export function CodeEditor() {
  const { doc, provider } = useYjsContext();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [mounted, setMounted] = useState(false);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    setMounted(true);
  };

  useEffect(() => {
    if (!doc || !editorRef.current || !mounted) return;

    const ytext = doc.getText("monaco");
    const model = editorRef.current.getModel()!;
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

  return (
    <Editor
      height="100%"
      language="python"
      theme="vs-dark"
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        tabSize: 4,
        readOnly: !doc,
      }}
    />
  );
}
