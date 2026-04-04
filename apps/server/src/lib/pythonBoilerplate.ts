const PYTHON_FUTURE_ANNOTATIONS_IMPORT = "from __future__ import annotations";

export function stripPythonFutureAnnotationsImport(template: string): string {
  if (template.trim().length === 0) {
    return template;
  }

  const futureImportPattern = new RegExp(
    `^${PYTHON_FUTURE_ANNOTATIONS_IMPORT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\r?\\n){1,2}`,
  );

  return template.replace(futureImportPattern, "");
}
