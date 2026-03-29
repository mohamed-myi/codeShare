export interface ExampleBlock {
  input: string;
  output: string;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, ""));
}

export function htmlToProblemText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<sup>(.*?)<\/sup>/gi, "^$1")
      .replace(/<code>([\s\S]*?)<\/code>/gi, (_match, code: string) => `\`${stripTags(code)}\``)
      .replace(
        /<pre>([\s\S]*?)<\/pre>/gi,
        (_match, block: string) => `\n\n${stripTags(block).trim()}\n\n`,
      )
      .replace(/<li>([\s\S]*?)<\/li>/gi, (_match, item: string) => `- ${stripTags(item).trim()}\n`)
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

export function extractConstraints(content: string): string[] {
  const match = content.match(/<p><strong>Constraints:<\/strong><\/p>\s*<ul>([\s\S]*?)<\/ul>/i);
  if (!match) {
    return [];
  }

  return Array.from(match[1].matchAll(/<li>([\s\S]*?)<\/li>/gi)).map((item) =>
    stripTags(item[1]).trim(),
  );
}

export function stripConstraintsSection(content: string): string {
  return content.replace(/<p><strong>Constraints:<\/strong><\/p>\s*<ul>[\s\S]*?<\/ul>/i, "");
}

export function extractExampleBlocks(content: string): ExampleBlock[] {
  const blocks = Array.from(content.matchAll(/<pre>([\s\S]*?)<\/pre>/gi)).map((match) =>
    stripTags(match[1]).trim(),
  );

  return blocks.map((block) => {
    const cleaned = block.replace(/\r/g, "").trim();
    const match = cleaned.match(/Input:\s*([\s\S]*?)\s*Output:\s*([\s\S]*?)(?:\s*Explanation:|$)/i);

    if (!match) {
      throw new Error("Failed to parse imported example test cases.");
    }

    return {
      input: match[1].trim(),
      output: match[2].trim(),
    };
  });
}

function splitTopLevel(source: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  let squareDepth = 0;
  let curlyDepth = 0;
  let parenDepth = 0;
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of source) {
    current += char;

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "[") squareDepth += 1;
    else if (char === "]") squareDepth -= 1;
    else if (char === "{") curlyDepth += 1;
    else if (char === "}") curlyDepth -= 1;
    else if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth -= 1;

    if (char === delimiter && squareDepth === 0 && curlyDepth === 0 && parenDepth === 0) {
      parts.push(current.slice(0, -1).trim());
      current = "";
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseScalarValue(raw: string): unknown {
  const trimmed = raw.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  throw new Error(`Unsupported imported value: ${trimmed}`);
}

export function parseLeetCodeValue(raw: string): unknown {
  const trimmed = raw.trim();

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  return parseScalarValue(trimmed);
}

export function parseInputAssignments(
  input: string,
  parameterNames: string[],
): Record<string, unknown> {
  const normalized = input.replace(/\s+/g, " ").trim();
  const assignments = splitTopLevel(normalized, ",");
  const parsed = assignments.map((assignment) => {
    const equalsIndex = assignment.indexOf("=");
    if (equalsIndex === -1) {
      throw new Error("Failed to parse imported example inputs.");
    }

    const name = assignment.slice(0, equalsIndex).trim();
    const value = assignment.slice(equalsIndex + 1).trim();
    return [name, parseLeetCodeValue(value)] as const;
  });

  const inputRecord = Object.fromEntries(parsed);
  for (const name of parameterNames) {
    if (!(name in inputRecord)) {
      throw new Error(`Imported example is missing parameter "${name}".`);
    }
  }

  return inputRecord;
}

export function parseMetadata(metaData: string): { methodName: string; parameterNames: string[] } {
  const parsed = JSON.parse(metaData) as {
    name?: string;
    params?: Array<{ name?: string }>;
  };
  const methodName = parsed.name?.trim();
  const parameterNames =
    parsed.params
      ?.map((param) => param.name?.trim())
      .filter((name): name is string => Boolean(name)) ?? [];

  if (!methodName || parameterNames.length === 0) {
    throw new Error("Imported problem is missing callable metadata.");
  }

  return { methodName, parameterNames };
}

export function selectPythonBoilerplate(
  codeSnippets: Array<{ langSlug: string; code: string }>,
): string {
  const snippet =
    codeSnippets.find((item) => item.langSlug === "python3") ??
    codeSnippets.find((item) => item.langSlug === "python");

  if (!snippet?.code.trim()) {
    throw new Error("Imported problem does not include Python boilerplate.");
  }

  return snippet.code;
}
