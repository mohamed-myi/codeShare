// Socket.io event name constants
// Direction: C = Client -> Server, S = Server -> Client, A = Server -> All

export const SocketEvents = {
  // Room lifecycle
  USER_JOIN: "user:join", // C -> S
  USER_JOINED: "user:joined", // S -> C
  USER_LEFT: "user:left", // S -> A
  ROOM_FULL: "room:full", // S -> C
  ROOM_SYNC: "room:sync", // S -> C

  // Problem management
  PROBLEM_SELECT: "problem:select", // C -> S
  PROBLEM_LOADED: "problem:loaded", // S -> A
  PROBLEM_ERROR: "problem:error", // S -> A
  PROBLEM_IMPORT: "problem:import", // C -> S
  PROBLEM_IMPORT_STATUS: "problem:import:status", // S -> A

  // Code execution
  CODE_RUN: "code:run", // C -> S
  CODE_SUBMIT: "code:submit", // C -> S
  EXECUTION_STARTED: "execution:started", // S -> A
  EXECUTION_RESULT: "execution:result", // S -> A
  EXECUTION_ERROR: "execution:error", // S -> A

  // Hint system
  HINT_REQUEST: "hint:request", // C -> S
  HINT_PENDING: "hint:pending", // S -> Other
  HINT_APPROVE: "hint:approve", // C -> S
  HINT_DENY: "hint:deny", // C -> S
  HINT_DENIED: "hint:denied", // S -> Requester
  HINT_CHUNK: "hint:chunk", // S -> A
  HINT_DONE: "hint:done", // S -> A
  HINT_ERROR: "hint:error", // S -> A

  // Solution (interview mode)
  SOLUTION_REVEAL: "solution:reveal", // C -> S
  SOLUTION_REVEALED: "solution:revealed", // S -> A

  // Test cases
  TESTCASE_ADD: "testcase:add", // C -> S
  TESTCASE_ADDED: "testcase:added", // S -> A
  TESTCASE_ERROR: "testcase:error", // S -> C

  // Auth / validation
  EVENT_REJECTED: "event:rejected", // S -> C

  // Yjs token rotation
  YJS_TOKEN_ROTATED: "yjs:token:rotated", // S -> A (remaining users)

  // Forward compatibility (post-MVP)
  LANGUAGE_CHANGE: "language:change", // C -> S
  LANGUAGE_CHANGED: "language:changed", // S -> A
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];
