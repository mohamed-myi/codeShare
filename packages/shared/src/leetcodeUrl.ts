export interface NormalizedLeetCodeUrl {
  slug: string;
  canonicalUrl: string;
}

export function normalizeLeetCodeUrl(input: string): NormalizedLeetCodeUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let urlString = trimmed;
  if (/^www\./i.test(urlString)) {
    urlString = `https://${urlString}`;
  } else if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  urlString = urlString.replace(/^http:\/\//i, "https://");

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "leetcode.com" && hostname !== "www.leetcode.com") {
    return null;
  }

  const pathMatch = parsed.pathname.match(/^\/problems\/([\w-]+)/);
  if (!pathMatch) return null;

  const slug = pathMatch[1];
  return { slug, canonicalUrl: `https://leetcode.com/problems/${slug}/` };
}
