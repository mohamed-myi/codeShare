import type {
  RoomState,
  UserJoinedPayload,
  ProblemLoadedPayload,
  ExecutionResult,
  ExecutionError,
  HintPendingPayload,
  HintDonePayload,
  ImportStatus,
  CustomTestCase,
  ExecutionType,
} from "@codeshare/shared";

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
  | { type: "SOLUTION_REVEALED"; payload: { solution: string } }
  | { type: "EVENT_REJECTED"; payload: { event: string; reason: string } };

export interface ClientRoomState extends RoomState {
  currentUserId: string | null;
  lastError: string | null;
  executionResult: ExecutionResult | null;
  hintText: string;
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
  lastError: null,
  executionResult: null,
  hintText: "",
  solution: null,
};

export function roomReducer(
  state: ClientRoomState,
  action: RoomAction,
): ClientRoomState {
  switch (action.type) {
    case "ROOM_SYNC":
      return { ...state, ...action.payload, lastError: null };

    case "USER_JOINED":
      return {
        ...state,
        users: [
          ...state.users,
          {
            id: action.payload.userId,
            displayName: action.payload.displayName,
            role: action.payload.role,
            connected: true,
          },
        ],
      };

    case "USER_LEFT":
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload.userId ? { ...u, connected: false } : u,
        ),
      };

    case "EXECUTION_STARTED":
      return { ...state, executionInProgress: true, executionResult: null };

    case "EXECUTION_RESULT":
      return { ...state, executionInProgress: false, executionResult: action.payload };

    case "EXECUTION_ERROR":
      return {
        ...state,
        executionInProgress: false,
        lastError: action.payload.message,
      };

    case "HINT_CHUNK":
      return { ...state, hintText: state.hintText + action.payload.text };

    case "HINT_DONE":
      return {
        ...state,
        hintText: action.payload.fullHint,
        hintsUsed: state.hintsUsed + 1,
      };

    case "HINT_DENIED":
      return { ...state, pendingHintRequest: null };

    case "TESTCASE_ADDED":
      return {
        ...state,
        customTestCases: [...state.customTestCases, action.payload.testCase],
      };

    case "SOLUTION_REVEALED":
      return { ...state, solution: action.payload.solution };

    case "EVENT_REJECTED":
      return { ...state, lastError: action.payload.reason };

    default:
      return state;
  }
}
