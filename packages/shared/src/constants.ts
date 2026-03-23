import type { Difficulty } from "./enums.js";

export const HINT_LIMIT_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export const ROOM_LIMITS = {
  MAX_USERS: 2,
  MAX_SUBMISSIONS: 20,
  MAX_IMPORTS: 3,
  MAX_CUSTOM_TEST_CASES: 10,
  MAX_TEST_CASE_BYTES: 10 * 1024,
} as const;

export const GLOBAL_LIMITS = {
  JUDGE0_DAILY: 100,
  IMPORTS_DAILY: 50,
} as const;

export const TIMEOUTS = {
  GRACE_PERIOD_MS: 5 * 60 * 1000,
  HINT_CONSENT_MS: 30 * 1000,
  JUDGE0_REQUEST_MS: 30 * 1000,
  SLOW_CASE_THRESHOLD_MS: 500,
} as const;

export const ROOM_CODE = {
  ALPHABET: "abcdefghijklmnopqrstuvwxyz234567",
  SEGMENT_LENGTH: 3,
  SEGMENT_COUNT: 2,
  MAX_RETRIES: 5,
} as const;

export const DEFAULT_TIME_LIMIT_MS = 5000;

export const SUPPORTED_LANGUAGES = ["python"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
