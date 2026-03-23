import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { SocketEvents } from "../../packages/shared/src/events";
import {
  buildImportedProblemUrl,
  createRoom,
  goToProblems,
  importProblem,
  resetTestState,
  readEditorCode,
  selectProblem,
  setEditorCode,
  uniqueImportSlug,
} from "../support/app";

async function openPageForForwardedIp(browser: Browser, ip: string) {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": ip,
    },
  });
  const page = await context.newPage();
  return { context, page };
}

const SERVER_URL = process.env.E2E_SERVER_URL ?? "http://127.0.0.1:3001";

async function createRoomViaApi(request: APIRequestContext, displayName: string): Promise<string> {
  const response = await request.post(`${SERVER_URL}/api/rooms`, {
    data: {
      mode: "collaboration",
      displayName,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { roomCode: string };
  return payload.roomCode;
}

async function connectImportClient(roomCode: string, displayName: string): Promise<ClientSocket> {
  const socket = ioClient(SERVER_URL, {
    path: "/ws/socket",
    transports: ["websocket"],
    autoConnect: true,
    query: { roomCode },
    extraHeaders: {
      origin: "http://127.0.0.1:5173",
      "x-forwarded-for": "203.0.113.8",
    },
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out connecting import client.")), 5_000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  const joined = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for USER_JOINED.")), 5_000);
    socket.once(SocketEvents.USER_JOINED, () => {
      clearTimeout(timer);
      resolve();
    });
  });
  socket.emit(SocketEvents.USER_JOIN, { displayName });
  await joined;
  return socket;
}

async function waitForImportStatus(socket: ClientSocket): Promise<{ status: string; message?: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for import status.")), 10_000);
    const handleStatus = (payload: { status: string; message?: string }) => {
      if (payload.status === "scraping") {
        return;
      }
      clearTimeout(timer);
      socket.off(SocketEvents.PROBLEM_IMPORT_STATUS, handleStatus);
      resolve(payload);
    };
    socket.on(SocketEvents.PROBLEM_IMPORT_STATUS, handleStatus);
  });
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
    const pages = [page];
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
        pages.push(runner);
        await createRoom(runner, { displayName: `Runner ${attempt}` });
        await goToProblems(runner);
        await selectProblem(runner, "two-sum");
        await expect.poll(() => readEditorCode(runner)).toContain("def twoSum");
        await setEditorCode(
          runner,
          "class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:pass-all\n        return [0, 1]\n",
        );
      }

      for (let run = 0; run < 3; run += 1) {
        await runner.getByTestId("run-code-button").click();
        await expect(runner.getByTestId("results-panel")).toContainText("3/3 passed");
      }
    }

    const overflow = await browser.newPage();
    pages.push(overflow);
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

    for (const runner of pages.slice(1)) {
      await runner.close();
    }
  });

  test("enforces the import IP rate limit", async ({ request }) => {
    const clients: ClientSocket[] = [];

    try {
      for (let roomIndex = 0; roomIndex < 2; roomIndex += 1) {
        const roomCode = await createRoomViaApi(request, `Importer ${roomIndex}`);
        const client = await connectImportClient(roomCode, `Importer ${roomIndex}`);
        clients.push(client);

        for (let importIndex = 0; importIndex < 2; importIndex += 1) {
          client.emit(SocketEvents.PROBLEM_IMPORT, {
            leetcodeUrl: buildImportedProblemUrl(uniqueImportSlug(`ip-limit-${roomIndex}-${importIndex}`)),
          });
          await expect(waitForImportStatus(client)).resolves.toMatchObject({ status: "saved" });
        }
      }

      const overflowRoom = await createRoomViaApi(request, "Importer overflow");
      const overflowClient = await connectImportClient(overflowRoom, "Importer overflow");
      clients.push(overflowClient);

      overflowClient.emit(SocketEvents.PROBLEM_IMPORT, {
        leetcodeUrl: buildImportedProblemUrl(uniqueImportSlug("ip-limit-overflow")),
      });

      await expect(waitForImportStatus(overflowClient)).resolves.toMatchObject({
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
