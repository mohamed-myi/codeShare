export const RoomMode = {
  COLLABORATION: "collaboration",
  INTERVIEW: "interview",
} as const;
export type RoomMode = (typeof RoomMode)[keyof typeof RoomMode];

export const UserRole = {
  PEER: "peer",
  INTERVIEWER: "interviewer",
  CANDIDATE: "candidate",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Difficulty = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const ExecutionType = {
  RUN: "run",
  SUBMIT: "submit",
} as const;
export type ExecutionType = (typeof ExecutionType)[keyof typeof ExecutionType];

export const ProblemSource = {
  CURATED: "curated",
  USER_SUBMITTED: "user_submitted",
} as const;
export type ProblemSource = (typeof ProblemSource)[keyof typeof ProblemSource];

export const ExecutionErrorType = {
  API_ERROR: "api_error",
  API_TIMEOUT: "api_timeout",
  COMPILATION_ERROR: "compilation_error",
  TIMEOUT: "timeout",
  RUNTIME_ERROR: "runtime_error",
  PARSE_ERROR: "parse_error",
  ROOM_LIMIT: "room_limit",
  GLOBAL_LIMIT: "global_limit",
  IP_LIMIT: "ip_limit",
} as const;
export type ExecutionErrorType = (typeof ExecutionErrorType)[keyof typeof ExecutionErrorType];

export const ImportStatus = {
  SCRAPING: "scraping",
  SAVED: "saved",
  FAILED: "failed",
} as const;
export type ImportStatus = (typeof ImportStatus)[keyof typeof ImportStatus];
