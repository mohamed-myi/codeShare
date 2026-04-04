import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function extractThemeToken(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!match) {
    throw new Error(`Missing theme token: ${name}`);
  }
  return match[1].trim();
}

function parseHexColor(value: string) {
  const normalized = value.replace("#", "");
  if (normalized.length !== 6) {
    throw new Error(`Unsupported hex color: ${value}`);
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function parseRgbaColor(value: string) {
  const match = value.match(
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|0?\.\d+|1)\s*\)$/,
  );
  if (!match) {
    throw new Error(`Unsupported rgba color: ${value}`);
  }

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: Number(match[4]),
  };
}

function compositeOverBackground(foreground: string, background: string) {
  const fg = parseRgbaColor(foreground);
  const bg = parseHexColor(background);

  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  };
}

function toRelativeLuminance(channel: number): number {
  const normalized = channel / 255;
  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(
  foreground: { r: number; g: number; b: number },
  background: string,
): number {
  const bg = parseHexColor(background);
  const foregroundLuminance =
    0.2126 * toRelativeLuminance(foreground.r) +
    0.7152 * toRelativeLuminance(foreground.g) +
    0.0722 * toRelativeLuminance(foreground.b);
  const backgroundLuminance =
    0.2126 * toRelativeLuminance(bg.r) +
    0.7152 * toRelativeLuminance(bg.g) +
    0.0722 * toRelativeLuminance(bg.b);

  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("theme contrast", () => {
  const css = readFileSync(path.resolve(__dirname, "../index.css"), "utf8");
  const background = extractThemeToken(css, "--color-bg-primary");

  it("keeps tertiary text at WCAG AA contrast on the primary background", () => {
    const tertiary = extractThemeToken(css, "--color-text-tertiary");
    const blended = compositeOverBackground(tertiary, background);
    expect(contrastRatio(blended, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps secondary text at WCAG AA contrast on the primary background", () => {
    const secondary = extractThemeToken(css, "--color-text-secondary");
    const blended = compositeOverBackground(secondary, background);
    expect(contrastRatio(blended, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps difficulty-easy at WCAG AA contrast on the primary background", () => {
    const easy = extractThemeToken(css, "--color-difficulty-easy");
    const blended = compositeOverBackground(easy, background);
    expect(contrastRatio(blended, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps difficulty-medium at WCAG AA contrast on the primary background", () => {
    const medium = extractThemeToken(css, "--color-difficulty-medium");
    const blended = compositeOverBackground(medium, background);
    expect(contrastRatio(blended, background)).toBeGreaterThanOrEqual(4.5);
  });
});
