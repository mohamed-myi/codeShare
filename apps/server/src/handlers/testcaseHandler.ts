import type { BoilerplateTemplate } from "@codeshare/shared";
import { ROOM_LIMITS, SocketEvents, testcaseAddSchema } from "@codeshare/shared";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
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
      socket.emit(SocketEvents.TESTCASE_ERROR, {
        message: "Select a problem before adding test cases.",
      });
      return;
    }

    const parsed = testcaseAddSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit(SocketEvents.TESTCASE_ERROR, {
        message: "Invalid test case payload.",
      });
      return;
    }

    if (room.customTestCases.length >= ROOM_LIMITS.MAX_CUSTOM_TEST_CASES) {
      socket.emit(SocketEvents.TESTCASE_ERROR, {
        message: `Custom test case limit reached (${ROOM_LIMITS.MAX_CUSTOM_TEST_CASES}).`,
      });
      return;
    }

    const payloadSize = Buffer.byteLength(JSON.stringify(parsed.data), "utf8");
    if (payloadSize > ROOM_LIMITS.MAX_TEST_CASE_BYTES) {
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
          return;
        }
      }

      if (room.customTestCases.length >= ROOM_LIMITS.MAX_CUSTOM_TEST_CASES) {
        socket.emit(SocketEvents.TESTCASE_ERROR, {
          message: `Custom test case limit reached (${ROOM_LIMITS.MAX_CUSTOM_TEST_CASES}).`,
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

      logger.info({ roomCode, customCount: room.customTestCases.length }, "Custom test case added");
    } catch (err) {
      logger.error({ err, roomCode }, "Failed to add test case");
      socket.emit(SocketEvents.TESTCASE_ERROR, {
        message: "Failed to add test case. Please try again.",
      });
    }
  });
}
