import type {
  CustomTestCase,
  ExecutionError,
  ExecutionResult,
  ExecutionType,
  HintDonePayload,
  HintPendingPayload,
  ImportStatus,
  Problem,
  ProblemLoadedPayload,
  RoomState,
  TestCase,
  UserJoinedPayload,
} from "@codeshare/shared";
import { HINT_LIMIT_BY_DIFFICULTY } from "@codeshare/shared";

export type RoomAction =
  | { type: "USER_JOINED"; payload: UserJoinedPayload }
  | { type: "USER_LEFT"; payload: { userId: string } }
  | { type: "ROOM_SYNC"; payload: RoomState }
  | { type: "PROBLEM_LOADED"; payload: ProblemLoadedPayload }
  | { type: "PROBLEM_ERROR"; payload: { message: string } }
  | { type: "EXECUTION_STARTED"; payload: { executionType: ExecutionType } }
  | { type: "EXECUTION_RESULT"; payload: ExecutionResult }
  | { type: "EXECUTION_ERROR"; payload: ExecutionError }
  | { type: "HINT_PENDING"; payload: HintPendingPayload }
  | { type: "HINT_CHUNK"; payload: { text: string } }
  | { type: "HINT_DONE"; payload: HintDonePayload }
  | { type: "HINT_DENIED" }
  | { type: "HINT_ERROR"; payload: { message: string } }
  | { type: "IMPORT_STATUS"; payload: { status: ImportStatus; message?: string } }
  | { type: "TESTCASE_ADDED"; payload: { testCase: CustomTestCase } }
  | { type: "TESTCASE_ERROR"; payload: { message: string } }
  | { type: "SOLUTION_REVEALED"; payload: { solution: string } }
  | { type: "EVENT_REJECTED"; payload: { event: string; reason: string } };

export interface ClientRoomState extends RoomState {
  currentUserId: string | null;
  currentProblem: Problem | null;
  visibleTestCases: TestCase[];
  parameterNames: string[];
  lastError: string | null;
  executionResult: ExecutionResult | null;
  importStatus: { status: ImportStatus; message?: string } | null;
  hintText: string;
  isHintStreaming: boolean;
  solution: string | null;
}

export const initialRoomState: ClientRoomState = {
  roomCode: "",
  mode: "collaboration",
  maxUsers: 2,
  users: [],
  problemId: null,
  language: "python",
  hintsUsed: 0,
  hintLimit: 0,
  pendingHintRequest: null,
  customTestCases: [],
  submissionsUsed: 0,
  submissionLimit: 20,
  executionInProgress: false,
  createdAt: "",
  lastActivityAt: "",
  currentUserId: null,
  currentProblem: null,
  visibleTestCases: [],
  parameterNames: [],
  lastError: null,
  executionResult: null,
  importStatus: null,
  hintText: "",
  isHintStreaming: false,
  solution: null,
};

export function roomReducer(state: ClientRoomState, action: RoomAction): ClientRoomState {
  switch (action.type) {
    case "ROOM_SYNC":
      return { ...state, ...action.payload, lastError: null };

    case "USER_JOINED": {
      const newUser = {
        id: action.payload.userId,
        displayName: action.payload.displayName,
        role: action.payload.role,
        connected: true,
      };
      const currentUserId = action.payload.reconnectToken
        ? action.payload.userId
        : state.currentUserId;
      const existingIndex = state.users.findIndex((u) => u.id === action.payload.userId);
      if (existingIndex >= 0) {
        const updated = [...state.users];
        updated[existingIndex] = newUser;
        return { ...state, users: updated, currentUserId };
      }
      return { ...state, users: [...state.users, newUser], currentUserId };
    }

    case "USER_LEFT":
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload.userId ? { ...u, connected: false } : u,
        ),
      };

    case "PROBLEM_LOADED":
      return {
        ...state,
        problemId: action.payload.problem.id,
        currentProblem: action.payload.problem,
        visibleTestCases: action.payload.visibleTestCases,
        parameterNames: action.payload.parameterNames ?? [],
        hintLimit: HINT_LIMIT_BY_DIFFICULTY[action.payload.problem.difficulty],
        hintsUsed: 0,
        customTestCases: [],
        pendingHintRequest: null,
        hintText: "",
        isHintStreaming: false,
        solution: null,
        lastError: null,
        executionResult: null,
        importStatus: null,
      };

    case "PROBLEM_ERROR":
      return { ...state, lastError: action.payload.message };

    case "IMPORT_STATUS":
      return { ...state, importStatus: action.payload };

    case "HINT_PENDING":
      return {
        ...state,
        pendingHintRequest: {
          requestedBy: action.payload.requestedBy,
          requestedAt: new Date().toISOString(),
        },
      };

    case "HINT_ERROR":
      return {
        ...state,
        lastError: action.payload.message,
        isHintStreaming: false,
        pendingHintRequest: null,
      };

    case "EXECUTION_STARTED":
      return {
        ...state,
        executionInProgress: true,
        executionResult: null,
        lastError: null,
      };

    case "EXECUTION_RESULT":
      return {
        ...state,
        executionInProgress: false,
        executionResult: action.payload,
        lastError: null,
      };

    case "EXECUTION_ERROR":
      return {
        ...state,
        executionInProgress: false,
        lastError: action.payload.message,
      };

    case "HINT_CHUNK":
      return { ...state, hintText: state.hintText + action.payload.text, isHintStreaming: true };

    case "HINT_DONE":
      return {
        ...state,
        hintText: action.payload.fullHint,
        hintsUsed: state.hintsUsed + 1,
        isHintStreaming: false,
        pendingHintRequest: null,
      };

    case "HINT_DENIED":
      return {
        ...state,
        pendingHintRequest: null,
        isHintStreaming: false,
        lastError: "Hint request denied.",
      };

    case "TESTCASE_ADDED":
      return {
        ...state,
        lastError: null,
        customTestCases: [...state.customTestCases, action.payload.testCase],
      };

    case "TESTCASE_ERROR":
      return { ...state, lastError: action.payload.message };

    case "SOLUTION_REVEALED":
      return { ...state, solution: action.payload.solution };

    case "EVENT_REJECTED":
      return { ...state, lastError: action.payload.reason };

    default:
      return state;
  }
}
