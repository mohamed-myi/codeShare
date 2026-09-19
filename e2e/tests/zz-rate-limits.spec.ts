import { type APIRequestContext, type Browser, expect, test } from "@playwright/test";
import {
  createTestClient,
  waitForEvent,
} from "../../apps/server/src/__tests__/helpers/socketTestHelper";
import { SocketEvents } from "../../packages/shared/src/events";
import {
  buildImportedProblemUrl,
  clientOrigin,
  createRoom,
  extractRoomCode,
  goToProblems,
  readEditorCode,
  resetTestState,
  selectProblem,
  serverUrl,
  setEditorCode,
  uniqueImportSlug,
} from "../support/app";

type ClientSocket = ReturnType<typeof createTestClient>;

async function _openPageForForwardedIp(browser: Browser, ip: string) {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": ip,
    },
  });
  const page = await context.newPage();
  return { context, page };
}

async function createRoomViaApi(request: APIRequestContext, displayName: string): Promise<string> {
  const response = await request.post(`${serverUrl}/api/rooms`, {
    data: {
      mode: "collaboration",
      displayName,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { roomCode: string };
  return payload.roomCode;
}

async function connectRoomClient(roomCode: string, displayName: string): Promise<ClientSocket> {
  const socket = createTestClient(Number(new URL(serverUrl).port), roomCode, {
    autoConnect: false,
    extraHeaders: {
      origin: clientOrigin,
      "x-forwarded-for": "203.0.113.8",
    },
  });

  try {
    const connected = waitForEvent(socket, "connect", 5_000);
    socket.connect();
    await connected;
    const joined = waitForEvent(socket, SocketEvents.USER_JOINED, 5_000);
    socket.emit(SocketEvents.USER_JOIN, { displayName });
    await joined;
    return socket;
  } catch (error) {
    socket.disconnect();
    throw error;
  }
}

function waitForImportStatus(socket: ClientSocket) {
  return waitForEvent<{ status: string; message?: string }>(
    socket,
    SocketEvents.PROBLEM_IMPORT_STATUS,
    {
      timeoutMs: 10_000,
      accept: (payload) => payload.status !== "scraping",
    },
  );
}

test.describe("MVP rate and cap gates", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("enforces per-room execution caps", async ({ page }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await expect.poll(() => readEditorCode(page)).toContain("def twoSum");
    await setEditorCode(
      page,
      "class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:pass-all\n        return [0, 1]\n",
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.getByTestId("run-code-button").click();
      await expect(page.getByTestId("results-panel")).toContainText("3/3 passed");
    }

    await page.getByTestId("run-code-button").click();
    await expect(page.getByTestId("room-error-banner")).toContainText("Session execution limit");
  });

  test("enforces the global execution cap across rooms", async ({ browser, page }) => {
    await createRoom(page, { displayName: "Runner 0" });
    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await expect.poll(() => readEditorCode(page)).toContain("def twoSum");
    await setEditorCode(
      page,
      "class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:pass-all\n        return [0, 1]\n",
    );

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const runner = attempt === 0 ? page : await browser.newPage();
      if (attempt > 0) {
        await createRoom(runner, { displayName: `Runner ${attempt}` });
        await goToProblems(runner);
        await selectProblem(runner, "two-sum");
        await expect.poll(() => readEditorCode(runner)).toContain("def twoSum");
        await setEditorCode(
          runner,
          "class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:pass-all\n        return [0, 1]\n",
        );
      }

      const observer = await connectRoomClient(extractRoomCode(runner.url()), "Quota observer");
      try {
        for (let run = 0; run < 3; run += 1) {
          const result = waitForEvent(observer, SocketEvents.EXECUTION_RESULT);
          await Promise.all([
            expect(result).resolves.toMatchObject({ type: "run", passed: 3, total: 3 }),
            runner.getByTestId("run-code-button").click(),
          ]);
          await expect(runner.getByTestId("results-panel")).toContainText("3/3 passed");
        }
      } finally {
        observer.disconnect();
      }
      // The global quota survives disconnects; completed rooms need no live browser.
      if (attempt > 0) await runner.close();
    }

    const overflow = await browser.newPage();
    await createRoom(overflow, { displayName: "Overflow" });
    await goToProblems(overflow);
    await selectProblem(overflow, "two-sum");
    await expect.poll(() => readEditorCode(overflow)).toContain("def twoSum");
    await setEditorCode(
      overflow,
      "class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:pass-all\n        return [0, 1]\n",
    );
    await overflow.getByTestId("run-code-button").click();
    await expect(overflow.getByTestId("room-error-banner")).toContainText(
      "Daily execution limit reached",
    );

    await overflow.close();
  });

  test("enforces the import IP rate limit", async ({ request }) => {
    const clients: ClientSocket[] = [];

    try {
      for (let roomIndex = 0; roomIndex < 2; roomIndex += 1) {
        const roomCode = await createRoomViaApi(request, `Importer ${roomIndex}`);
        const client = await connectRoomClient(roomCode, `Importer ${roomIndex}`);
        clients.push(client);

        for (let importIndex = 0; importIndex < 2; importIndex += 1) {
          const imported = waitForImportStatus(client);
          client.emit(SocketEvents.PROBLEM_IMPORT, {
            leetcodeUrl: buildImportedProblemUrl(
              uniqueImportSlug(`ip-limit-${roomIndex}-${importIndex}`),
            ),
          });
          await expect(imported).resolves.toMatchObject({ status: "saved" });
        }
      }

      const overflowRoom = await createRoomViaApi(request, "Importer overflow");
      const overflowClient = await connectRoomClient(overflowRoom, "Importer overflow");
      clients.push(overflowClient);

      const rejected = waitForImportStatus(overflowClient);
      overflowClient.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: buildImportedProblemUrl(uniqueImportSlug("ip-limit-overflow")),
      });

      await expect(rejected).resolves.toMatchObject({
        status: "failed",
        message: expect.stringContaining("Too many import attempts"),
      });
    } finally {
      for (const client of clients) {
        client.disconnect();
      }
    }
  });

  test("enforces room creation IP rate limiting", async ({ request }) => {
    let blockedStatus = 0;
    for (let index = 0; index < 150; index += 1) {
      const response = await request.post("/api/rooms", {
        data: {
          mode: "collaboration",
          displayName: `Creator ${index}`,
        },
      });
      if (response.status() === 429) {
        blockedStatus = response.status();
        break;
      }
      expect(response.ok()).toBeTruthy();
    }

    expect(blockedStatus).toBe(429);
  });
});
