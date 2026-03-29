import type { BoilerplateTemplate } from "@codeshare/shared";
import { ROOM_LIMITS, SocketEvents, testcaseAddSchema } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import { requestIdLogField, roomCodeLogFields } from "../lib/logger.js";
import type { Room } from "../models/Room.js";

interface RoomLookup {
  getRoom(roomCode: string): Room | undefined;
}

type GetBoilerplate = (problemId: string, language: string) => Promise<BoilerplateTemplate | null>;

export function registerTestcaseHandler(
  io: Server,
  socket: Socket,
  logger: Logger,
  roomLookup: RoomLookup,
  getBoilerplate: GetBoilerplate,
): void {
  socket.on(SocketEvents.TESTCASE_ADD, async (data: unknown) => {
    const roomCode = socket.data.roomCode as string;
    const room = roomLookup.getRoom(roomCode);
    if (!room) return;

    if (!room.problemId) {
      logger.info({
        event: "testcase_add_rejected",
        ...roomCodeLogFields(roomCode),
        ...requestIdLogField(socket),
        reason: "problem_not_selected",
      });
      socket.emit(SocketEvents.TESTCASE_ERROR, {
        message: "Select a problem before adding test cases.",
      });
      return;
    }

    const parsed = testcaseAddSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn({
        event: "testcase_add_rejected",
        ...roomCodeLogFields(roomCode),
        ...requestIdLogField(socket),
        reason: "invalid_payload",
      });
      socket.emit(SocketEvents.TESTCASE_ERROR, {
        message: "Invalid test case payload.",
      });
      return;
    }

    if (room.customTestCases.length >= room.customTestCaseLimit) {
      logger.info({
        event: "testcase_add_rejected",
        ...roomCodeLogFields(roomCode),
        ...requestIdLogField(socket),
        custom_count: room.customTestCases.length,
        custom_limit: room.customTestCaseLimit,
        reason: "custom_limit_reached",
      });
      socket.emit(SocketEvents.TESTCASE_ERROR, {
        message: `Custom test case limit reached (${room.customTestCaseLimit}).`,
      });
      return;
    }

    const payloadSize = Buffer.byteLength(JSON.stringify(parsed.data), "utf8");
    if (payloadSize > ROOM_LIMITS.MAX_TEST_CASE_BYTES) {
      logger.warn({
        event: "testcase_add_rejected",
        ...roomCodeLogFields(roomCode),
        ...requestIdLogField(socket),
        payload_size_bytes: payloadSize,
        max_payload_bytes: ROOM_LIMITS.MAX_TEST_CASE_BYTES,
        reason: "payload_too_large",
      });
      socket.emit(SocketEvents.TESTCASE_ERROR, {
        message: `Test case exceeds maximum size (${ROOM_LIMITS.MAX_TEST_CASE_BYTES / 1024}KB).`,
      });
      return;
    }

    try {
      const boilerplate = await getBoilerplate(room.problemId, room.language);
      if (boilerplate) {
        const inputKeys = Object.keys(parsed.data.input).sort();
        const paramKeys = [...boilerplate.parameterNames].sort();
        if (
          inputKeys.length !== paramKeys.length ||
          !inputKeys.every((k, i) => k === paramKeys[i])
        ) {
          socket.emit(SocketEvents.TESTCASE_ERROR, {
            message: `Input keys must match parameter names: [${boilerplate.parameterNames.join(", ")}].`,
          });
          logger.warn({
            event: "testcase_add_rejected",
            ...roomCodeLogFields(roomCode),
            ...requestIdLogField(socket),
            reason: "parameter_mismatch",
          });
          return;
        }
      }

      if (room.customTestCases.length >= room.customTestCaseLimit) {
        logger.info({
          event: "testcase_add_rejected",
          ...roomCodeLogFields(roomCode),
          ...requestIdLogField(socket),
          custom_count: room.customTestCases.length,
          custom_limit: room.customTestCaseLimit,
          reason: "custom_limit_reached",
        });
        socket.emit(SocketEvents.TESTCASE_ERROR, {
          message: `Custom test case limit reached (${room.customTestCaseLimit}).`,
        });
        return;
      }

      const testCase = {
        input: parsed.data.input,
        expectedOutput: parsed.data.expectedOutput,
      };

      room.customTestCases.push(testCase);
      room.lastActivityAt = new Date();

      io.to(roomCode).emit(SocketEvents.TESTCASE_ADDED, { testCase });

      logger.info(
        {
          event: "testcase_added",
          ...roomCodeLogFields(roomCode),
          ...requestIdLogField(socket),
          custom_count: room.customTestCases.length,
        },
        "Custom test case added",
      );
    } catch (err) {
      logger.error(
        {
          event: "testcase_add_failed",
          err,
          ...roomCodeLogFields(roomCode),
          ...requestIdLogField(socket),
        },
        "Failed to add test case",
      );
      socket.emit(SocketEvents.TESTCASE_ERROR, {
        message: "Failed to add test case. Please try again.",
      });
    }
  });
}
