/**
 * Centralized difficulty color constants for consistent styling across components.
 * Uses the --color-difficulty-* CSS variables for neutral, hierarchical styling.
 */
export const DIFFICULTY_COLORS = {
  easy: "text-[var(--color-difficulty-easy)]",
  medium: "text-[var(--color-difficulty-medium)]",
  hard: "text-[var(--color-difficulty-hard)]",
} as const;

export type Difficulty = keyof typeof DIFFICULTY_COLORS;
