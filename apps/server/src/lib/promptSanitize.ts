/**
 * Escape bracket-delimited tags so user content can't break out of delimited blocks.
 * Replaces ASCII brackets with fullwidth Unicode equivalents.
 */
export function escapeDelimiters(value: string, tags: string[]): string {
  const tagPattern = tags.join("|");
  const regex = new RegExp(`\\[\\/?(?:${tagPattern}|SYSTEM)\\]`, "gi");
  return value.replace(regex, (match) => match.replace(/\[/g, "\uFF3B").replace(/\]/g, "\uFF3D"));
}

export function buildDelimitedBlock(label: string, value: string, tags: string[]): string {
  return `[${label}]\n${escapeDelimiters(value, tags)}\n[/${label}]`;
}
