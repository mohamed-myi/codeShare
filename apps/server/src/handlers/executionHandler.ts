import type { BoilerplateTemplate, Problem, TestCase } from "@codeshare/shared";
import { ExecutionErrorType, harnessResultSchema, SocketEvents } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import type * as Y from "yjs";
import { dependencyErrorLogFields } from "../lib/dependencyError.js";
import { emitExecutionError } from "../lib/errorEmitter.js";
import { handlerLogContext } from "../lib/handlerContext.js";
import type { IpRateLimiter } from "../lib/ipRateLimiter.js";
import { getClientIp } from "../lib/ipUtils.js";
import { globalCounters } from "../lib/rateLimitCounters.js";
import { createHandlerSession } from "../lib/sessionFactory.js";
import type { Room } from "../models/Room.js";
import { executionService } from "../services/ExecutionService.js";

const MAX_STDERR_CHARS = 500;

type ExecutionType = "run" | "submit";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
}

interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

interface ExecutionSession {
  io: Server;
  socket: Socket;
  logger: Logger;
  deps: ExecutionHandlerDeps;
  room: Room;
  roomCode: string;
  executionType: ExecutionType;
}

interface LoadedExecutionResources {
  code: string;
  testCases: TestCase[];
  boilerplate: BoilerplateTemplate;
  problem: Problem;
}

interface ParsedHarnessResult {
  results: Array<{
    index: number;
    passed: boolean;
    elapsed_ms?: number;
    got?: string | null;
    expected?: string | null;
    error?: string | null;
  }>;
  userStdout: string;
}

export interface ExecutionHandlerDeps {
  roomLookup: RoomLookup;
  getDoc: (roomCode: string) => Y.Doc | undefined;
  judge0Client: { submit(source: string, timeLimitMs: number): Promise<Judge0Response> };
  dailyLimit: number;
  maxCodeBytes: number;
  ipRateLimiter?: IpRateLimiter;
  judge0ExecPerHour?: number;
  findVisible: (problemId: string) => Promise<TestCase[]>;
  findByProblemId: (problemId: string) => Promise<TestCase[]>;
  findBoilerplate: (problemId: string, language: string) => Promise<BoilerplateTemplate | null>;
  findProblem: (problemId: string) => Promise<Problem | null>;
}

function sanitizeStderr(stderr: string | null): string {
  if (!stderr) {
    return "Unknown error.";
  }

  const stripped = stderr.replace(
    /\/(?:usr|home|tmp|var|etc|opt|root|proc|sys|lib|run|snap|nix|srv|mnt|media|boot)\/[^\s:]*/g,
    "",
  );
  return stripped.length > MAX_STDERR_CHARS
    ? `${stripped.slice(0, MAX_STDERR_CHARS)}...`
    : stripped;
}

function createExecutionSession(
  io: Server,
  socket: Socket,
  logger: Logger,
  deps: ExecutionHandlerDeps,
  executionType: ExecutionType,
): ExecutionSession | null {
  return createHandlerSession(
    socket,
    io,
    logger,
    deps.roomLookup,
    () => ({ io, socket, logger, deps, executionType }),
    (room) => room.problemId !== null,
  );
}

function checkIpExecutionLimit(session: ExecutionSession): boolean {
  if (!session.deps.ipRateLimiter) {
    return true;
  }

  const clientIp = getClientIp(session.socket);
  const ipCheck = session.deps.ipRateLimiter.consume(
    "judge0-exec",
    clientIp,
    session.deps.judge0ExecPerHour ?? 30,
    3_600_000,
  );
  if (ipCheck.allowed) {
    return true;
  }

  session.logger.warn({
    event: "execution_rejected",
    ...handlerLogContext(session.roomCode, session.socket),
    execution_type: session.executionType,
    client_ip: clientIp,
    retry_after_seconds: ipCheck.retryAfterSeconds,
    reason: "ip_limit_reached",
  });
  emitExecutionError(
    { io: session.io, socket: session.socket, roomCode: session.roomCode },
    ExecutionErrorType.IP_LIMIT,
    `Too many executions. Try again in ${ipCheck.retryAfterSeconds}s.`,
    "socket",
  );
  return false;
}

function checkRoomExecutionLimit(session: ExecutionSession): boolean {
  const canExec = session.room.canExecute();
  if (canExec.allowed) {
    return true;
  }

  session.logger.info({
    event: "execution_rejected",
    ...handlerLogContext(session.roomCode, session.socket),
    execution_type: session.executionType,
    reason: canExec.reason ?? "execution_not_allowed",
  });
  emitExecutionError(
    { io: session.io, socket: session.socket, roomCode: session.roomCode },
    ExecutionErrorType.ROOM_LIMIT,
    canExec.reason ?? "Execution not allowed.",
    "socket",
  );
  return false;
}

function readCurrentCode(session: ExecutionSession): string {
  return session.deps.getDoc(session.roomCode)?.getText("monaco").toString() ?? "";
}

function validateCodeSize(session: ExecutionSession, code: string): boolean {
  const codeSizeBytes = Buffer.byteLength(code, "utf8");
  if (codeSizeBytes <= session.deps.maxCodeBytes) {
    return true;
  }

  session.logger.warn({
    event: "execution_rejected",
    ...handlerLogContext(session.roomCode, session.socket),
    execution_type: session.executionType,
    code_size_bytes: codeSizeBytes,
    max_code_bytes: session.deps.maxCodeBytes,
    reason: "code_too_large",
  });
  emitExecutionError(
    { io: session.io, socket: session.socket, roomCode: session.roomCode },
    ExecutionErrorType.API_ERROR,
    `Code size limit exceeded (${session.deps.maxCodeBytes} bytes).`,
    "room",
  );
  return false;
}

async function loadTestCases(session: ExecutionSession): Promise<TestCase[]> {
  if (session.executionType === "submit") {
    return session.deps.findByProblemId(session.room.problemId as string);
  }

  const visible = await session.deps.findVisible(session.room.problemId as string);
  return [
    ...visible,
    ...session.room.customTestCases.map((testCase, index) => ({
      id: `custom-${index}`,
      problemId: session.room.problemId as string,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isVisible: true,
      orderIndex: visible.length + index,
    })),
  ];
}

async function loadExecutionResources(
  session: ExecutionSession,
): Promise<LoadedExecutionResources | null> {
  const code = readCurrentCode(session);
  if (!validateCodeSize(session, code)) {
    return null;
  }

  const [testCases, boilerplate, problem] = await Promise.all([
    loadTestCases(session),
    session.deps.findBoilerplate(session.room.problemId as string, session.room.language),
    session.deps.findProblem(session.room.problemId as string),
  ]);

  if (!boilerplate || !problem) {
    session.logger.error({
      event: "execution_configuration_missing",
      ...handlerLogContext(session.roomCode, session.socket),
      execution_type: session.executionType,
      problem_id: session.room.problemId,
    });
    emitExecutionError(
      { io: session.io, socket: session.socket, roomCode: session.roomCode },
      ExecutionErrorType.API_ERROR,
      "Problem configuration not found.",
      "room",
    );
    return null;
  }

  return { code, testCases, boilerplate, problem };
}

function reserveSubmission(session: ExecutionSession): boolean {
  if (globalCounters.reserveSubmission(session.deps.dailyLimit)) {
    return true;
  }

  session.logger.warn({
    event: "execution_rejected",
    ...handlerLogContext(session.roomCode, session.socket),
    execution_type: session.executionType,
    daily_limit: session.deps.dailyLimit,
    reason: "global_limit_reached",
  });
  emitExecutionError(
    { io: session.io, socket: session.socket, roomCode: session.roomCode },
    ExecutionErrorType.GLOBAL_LIMIT,
    "Daily execution limit reached. Please try again tomorrow.",
    "room",
  );
  return false;
}

function emitJudge0StatusError(session: ExecutionSession, response: Judge0Response): boolean {
  const statusId = response.status.id;

  if (statusId === 6) {
    emitExecutionError(
      { io: session.io, socket: session.socket, roomCode: session.roomCode },
      ExecutionErrorType.COMPILATION_ERROR,
      sanitizeStderr(response.stderr),
      "room",
    );
    return true;
  }

  if (statusId === 5) {
    emitExecutionError(
      { io: session.io, socket: session.socket, roomCode: session.roomCode },
      ExecutionErrorType.TIMEOUT,
      "Time limit exceeded.",
      "room",
    );
    return true;
  }

  if (statusId >= 7) {
    emitExecutionError(
      { io: session.io, socket: session.socket, roomCode: session.roomCode },
      ExecutionErrorType.RUNTIME_ERROR,
      sanitizeStderr(response.stderr),
      "room",
    );
    return true;
  }

  return false;
}

function emitExecutionResult(
  session: ExecutionSession,
  parsedResults: ParsedHarnessResult,
  testCases: TestCase[],
): void {
  if (session.executionType === "run") {
    const result = executionService.buildRunResult(
      parsedResults.results,
      parsedResults.userStdout,
      testCases,
    );
    session.io.to(session.roomCode).emit(SocketEvents.EXECUTION_RESULT, result);
    return;
  }

  const result = executionService.buildSubmitResult(parsedResults.results, testCases);
  session.io.to(session.roomCode).emit(SocketEvents.EXECUTION_RESULT, result);
}

function handleAcceptedExecutionResult(
  session: ExecutionSession,
  response: Judge0Response,
  testCases: TestCase[],
  nonce: string,
): void {
  const stdout = response.stdout ?? "";
  const harnessModuleError = executionService.parseHarnessModuleError(stdout, nonce);
  if (harnessModuleError) {
    emitExecutionError(
      { io: session.io, socket: session.socket, roomCode: session.roomCode },
      harnessModuleError.errorType,
      sanitizeStderr(harnessModuleError.error),
      "room",
    );
    return;
  }

  const parsed = executionService.parseResult(stdout, nonce);
  if (!parsed) {
    emitExecutionError(
      { io: session.io, socket: session.socket, roomCode: session.roomCode },
      ExecutionErrorType.PARSE_ERROR,
      "Could not parse execution results.",
      "room",
    );
    return;
  }

  const validated = harnessResultSchema.safeParse(parsed);
  if (!validated.success) {
    emitExecutionError(
      { io: session.io, socket: session.socket, roomCode: session.roomCode },
      ExecutionErrorType.PARSE_ERROR,
      "Execution results failed validation.",
      "room",
    );
    return;
  }

  emitExecutionResult(session, validated.data, testCases);
}

async function submitExecution(
  session: ExecutionSession,
  resources: LoadedExecutionResources,
): Promise<void> {
  const nonce = executionService.generateNonce();
  const harness = executionService.buildHarness(
    resources.code,
    resources.testCases,
    resources.boilerplate.methodName,
    nonce,
  );

  const judge0Start = Date.now();
  const response = await session.deps.judge0Client.submit(harness, resources.problem.timeLimitMs);
  const durationMs = Date.now() - judge0Start;
  session.logger.info(
    {
      event: "execution_dependency_completed",
      ...handlerLogContext(session.roomCode, session.socket),
      execution_type: session.executionType,
      dependency: "judge0",
      duration_ms: durationMs,
      status_id: response.status.id,
    },
    "Judge0 submission completed",
  );

  if (emitJudge0StatusError(session, response)) {
    return;
  }

  handleAcceptedExecutionResult(session, response, resources.testCases, nonce);
}

async function handleExecution(session: ExecutionSession): Promise<void> {
  if (!checkIpExecutionLimit(session) || !checkRoomExecutionLimit(session)) {
    return;
  }

  session.room.executionInProgress = true;
  session.io.to(session.roomCode).emit(SocketEvents.EXECUTION_STARTED, {
    executionType: session.executionType,
  });

  let submissionReserved = false;
  try {
    const resources = await loadExecutionResources(session);
    if (!resources) {
      return;
    }

    if (!reserveSubmission(session)) {
      return;
    }
    submissionReserved = true;

    await submitExecution(session, resources);
  } catch (err) {
    const errorType =
      err instanceof DOMException && err.name === "AbortError"
        ? ExecutionErrorType.API_TIMEOUT
        : ExecutionErrorType.API_ERROR;

    session.logger.error(
      {
        event: "execution_failed",
        err,
        ...handlerLogContext(session.roomCode, session.socket),
        execution_type: session.executionType,
        execution_error_type: errorType,
        ...dependencyErrorLogFields(err),
      },
      "Execution failed",
    );

    emitExecutionError(
      { io: session.io, socket: session.socket, roomCode: session.roomCode },
      errorType,
      err instanceof Error ? err.message : "Execution failed.",
      "room",
    );
  } finally {
    session.room.executionInProgress = false;
    if (submissionReserved) {
      session.room.submissionsUsed += 1;
    }
    session.room.lastActivityAt = new Date();
  }
}

export function registerExecutionHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  deps: ExecutionHandlerDeps,
): void {
  const registerHandler = (executionType: ExecutionType) => async () => {
    const session = createExecutionSession(io, socket, logger, deps, executionType);
    if (!session) {
      return;
    }

    await handleExecution(session);
  };

  socket.on(SocketEvents.CODE_RUN, registerHandler("run"));
  socket.on(SocketEvents.CODE_SUBMIT, registerHandler("submit"));
}
