import type { BoilerplateTemplate, Problem, TestCase } from "@codeshare/shared";
import { ExecutionErrorType, harnessResultSchema, SocketEvents } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import type * as Y from "yjs";
import type { IpRateLimiter } from "../lib/ipRateLimiter.js";
import { globalCounters } from "../lib/rateLimitCounters.js";
import type { Room } from "../models/Room.js";
import { executionService } from "../services/ExecutionService.js";

const MAX_STDERR_CHARS = 500;

function sanitizeStderr(stderr: string | null): string {
  if (!stderr) return "Unknown error.";
  const stripped = stderr.replace(
    /\/(?:usr|home|tmp|var|etc|opt|root|proc|sys|lib|run|snap|nix|srv|mnt|media|boot)\/[^\s:]*/g,
    "",
  );
  return stripped.length > MAX_STDERR_CHARS
    ? `${stripped.slice(0, MAX_STDERR_CHARS)}...`
    : stripped;
}

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

export function registerExecutionHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  deps: ExecutionHandlerDeps,
): void {
  async function handleExecution(executionType: "run" | "submit") {
    const roomCode = socket.data.roomCode as string;
    const room = deps.roomLookup.getRoom(roomCode);
    if (!room || !room.problemId) return;

    if (deps.ipRateLimiter) {
      const clientIp = (socket.data.clientIp as string | undefined) ?? "unknown";
      const ipCheck = deps.ipRateLimiter.consume(
        "judge0-exec",
        clientIp,
        deps.judge0ExecPerHour ?? 30,
        3_600_000,
      );
      if (!ipCheck.allowed) {
        socket.emit(SocketEvents.EXECUTION_ERROR, {
          errorType: ExecutionErrorType.IP_LIMIT,
          message: `Too many executions. Try again in ${ipCheck.retryAfterSeconds}s.`,
        });
        return;
      }
    }

    const canExec = room.canExecute();
    if (!canExec.allowed) {
      socket.emit(SocketEvents.EXECUTION_ERROR, {
        errorType: ExecutionErrorType.ROOM_LIMIT,
        message: canExec.reason ?? "Execution not allowed.",
      });
      return;
    }

    room.executionInProgress = true;
    io.to(roomCode).emit(SocketEvents.EXECUTION_STARTED, { executionType });

    let submissionReserved = false;
    try {
      const code = deps.getDoc(roomCode)?.getText("monaco").toString() ?? "";
      if (Buffer.byteLength(code, "utf8") > deps.maxCodeBytes) {
        io.to(roomCode).emit(SocketEvents.EXECUTION_ERROR, {
          errorType: ExecutionErrorType.API_ERROR,
          message: `Code size limit exceeded (${deps.maxCodeBytes} bytes).`,
        });
        return;
      }

      const [testCases, boilerplate, problem] = await Promise.all([
        executionType === "run"
          ? deps.findVisible(room.problemId).then((visible) => [
              ...visible,
              ...room.customTestCases.map((ct, i) => ({
                id: `custom-${i}`,
                problemId: room.problemId as string,
                input: ct.input,
                expectedOutput: ct.expectedOutput,
                isVisible: true,
                orderIndex: visible.length + i,
              })),
            ])
          : deps.findByProblemId(room.problemId),
        deps.findBoilerplate(room.problemId, room.language),
        deps.findProblem(room.problemId),
      ]);

      if (!boilerplate || !problem) {
        io.to(roomCode).emit(SocketEvents.EXECUTION_ERROR, {
          errorType: ExecutionErrorType.API_ERROR,
          message: "Problem configuration not found.",
        });
        return;
      }

      const nonce = executionService.generateNonce();
      const harness = executionService.buildHarness(code, testCases, boilerplate.methodName, nonce);
      if (!globalCounters.reserveSubmission(deps.dailyLimit)) {
        io.to(roomCode).emit(SocketEvents.EXECUTION_ERROR, {
          errorType: ExecutionErrorType.GLOBAL_LIMIT,
          message: "Daily execution limit reached. Please try again tomorrow.",
        });
        return;
      }
      submissionReserved = true;
      const judge0Start = Date.now();
      const response = await deps.judge0Client.submit(harness, problem.timeLimitMs);
      const durationMs = Date.now() - judge0Start;
      logger.info(
        { roomCode, executionType, service: "judge0", durationMs },
        "Judge0 submission completed",
      );

      // Map Judge0 status codes
      const statusId = response.status.id;

      if (statusId === 6) {
        io.to(roomCode).emit(SocketEvents.EXECUTION_ERROR, {
          errorType: ExecutionErrorType.COMPILATION_ERROR,
          message: sanitizeStderr(response.stderr),
        });
        return;
      }

      if (statusId === 5) {
        io.to(roomCode).emit(SocketEvents.EXECUTION_ERROR, {
          errorType: ExecutionErrorType.TIMEOUT,
          message: "Time limit exceeded.",
        });
        return;
      }

      if (statusId >= 7) {
        io.to(roomCode).emit(SocketEvents.EXECUTION_ERROR, {
          errorType: ExecutionErrorType.RUNTIME_ERROR,
          message: sanitizeStderr(response.stderr),
        });
        return;
      }

      // Status 3 = Accepted, parse harness result
      const parsed = executionService.parseResult(response.stdout ?? "", nonce);
      if (!parsed) {
        io.to(roomCode).emit(SocketEvents.EXECUTION_ERROR, {
          errorType: ExecutionErrorType.PARSE_ERROR,
          message: "Could not parse execution results.",
        });
        return;
      }

      const validated = harnessResultSchema.safeParse(parsed);
      if (!validated.success) {
        io.to(roomCode).emit(SocketEvents.EXECUTION_ERROR, {
          errorType: ExecutionErrorType.PARSE_ERROR,
          message: "Execution results failed validation.",
        });
        return;
      }

      if (executionType === "run") {
        const result = executionService.buildRunResult(
          validated.data.results,
          validated.data.userStdout,
          testCases,
        );
        io.to(roomCode).emit(SocketEvents.EXECUTION_RESULT, result);
      } else {
        const result = executionService.buildSubmitResult(validated.data.results, testCases);
        io.to(roomCode).emit(SocketEvents.EXECUTION_RESULT, result);
      }
    } catch (err) {
      const errorType =
        err instanceof DOMException && err.name === "AbortError"
          ? ExecutionErrorType.API_TIMEOUT
          : ExecutionErrorType.API_ERROR;

      logger.error({ err, roomCode, executionType, errorType }, "Execution failed");

      io.to(roomCode).emit(SocketEvents.EXECUTION_ERROR, {
        errorType,
        message: err instanceof Error ? err.message : "Execution failed.",
      });
    } finally {
      room.executionInProgress = false;
      if (submissionReserved) {
        room.submissionsUsed++;
      }
      room.lastActivityAt = new Date();
    }
  }

  socket.on(SocketEvents.CODE_RUN, () => handleExecution("run"));
  socket.on(SocketEvents.CODE_SUBMIT, () => handleExecution("submit"));
}
