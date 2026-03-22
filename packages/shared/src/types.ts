import type { SupportedLanguage } from "./constants.js";
import type {
  Difficulty,
  ExecutionErrorType,
  ImportStatus,
  ProblemSource,
  RoomMode,
  UserRole,
} from "./enums.js";

// --- Problem Domain ---

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  description: string;
  constraints: string[];
  solution: string | null;
  timeLimitMs: number;
  source: ProblemSource;
  sourceUrl: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string;
  problemId: string;
  input: Record<string, unknown>;
  expectedOutput: unknown;
  isVisible: boolean;
  orderIndex: number;
}

export interface BoilerplateTemplate {
  id: string;
  problemId: string;
  language: SupportedLanguage;
  template: string;
  methodName: string;
  parameterNames: string[];
}

export interface Hint {
  id: string;
  problemId: string;
  hintText: string;
  orderIndex: number;
}

// --- Room Domain ---

export interface RoomUser {
  id: string;
  displayName: string;
  role: UserRole;
  connected: boolean;
}

export interface PendingHintRequest {
  requestedBy: string;
  requestedAt: string;
}

export interface CustomTestCase {
  input: Record<string, unknown>;
  expectedOutput: unknown;
}

export interface RoomState {
  roomCode: string;
  mode: RoomMode;
  maxUsers: number;
  users: RoomUser[];
  problemId: string | null;
  language: SupportedLanguage;
  hintsUsed: number;
  hintLimit: number;
  pendingHintRequest: PendingHintRequest | null;
  customTestCases: CustomTestCase[];
  submissionsUsed: number;
  submissionLimit: number;
  executionInProgress: boolean;
  createdAt: string;
  lastActivityAt: string;
}

// --- Execution Results ---

export interface CaseResult {
  index: number;
  passed: boolean;
  elapsedMs: number;
  got?: string;
  expected?: string;
  error?: string;
  input?: string;
  slow?: boolean;
}

export interface RunResult {
  type: "run";
  passed: number;
  total: number;
  cases: CaseResult[];
  userStdout: string;
}

export interface SubmitResult {
  type: "submit";
  passed: number;
  total: number;
  firstFailure: {
    index: number;
    input: string;
    got: string;
    expected: string;
  } | null;
}

export type ExecutionResult = RunResult | SubmitResult;

export interface ExecutionError {
  errorType: ExecutionErrorType;
  message: string;
}

// --- Socket Event Payloads ---

export interface UserJoinPayload {
  displayName: string;
  reconnectToken?: string;
}

export interface UserJoinedPayload {
  userId: string;
  displayName: string;
  role: UserRole;
  mode: RoomMode;
  reconnectToken: string;
  yjsToken: string;
}

export interface ProblemLoadedPayload {
  problem: Problem;
  visibleTestCases: TestCase[];
  boilerplate: string;
  parameterNames: string[];
}

export interface HintPendingPayload {
  requestedBy: string;
  displayName: string;
  hintsUsed: number;
  hintLimit: number;
}

export interface HintDonePayload {
  fullHint: string;
  hintsRemaining: number;
}

export interface ImportStatusPayload {
  status: ImportStatus;
  message?: string;
  retryAfterSeconds?: number;
}

export interface EventRejectedPayload {
  event: string;
  reason: string;
  retryAfterSeconds?: number;
}

// --- API Response Types ---

export interface ProblemListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
}

export interface ProblemDetail extends Problem {
  visibleTestCases: TestCase[];
  boilerplate: BoilerplateTemplate | null;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  roomCount: number;
  dbConnected: boolean;
}

export interface RoomInfoResponse {
  exists: boolean;
  mode?: RoomMode;
  userCount?: number;
  maxUsers?: number;
}
