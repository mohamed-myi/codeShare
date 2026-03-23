import { expect, test } from "@playwright/test";
import {
  captureSessionState,
  createRoom,
  goToProblems,
  goToSolver,
  joinRoom,
  openSessionPage,
  readEditorCode,
  resetTestState,
  selectProblem,
  setEditorCode,
} from "../support/app";

test.describe("MVP room lifecycle", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("creates collaboration rooms and joins a second participant from the shared link", async ({
    browser,
    page,
  }) => {
    const roomCode = await createRoom(page, { displayName: "Alice" });
    await expect(page.getByTestId("waiting-banner")).toBeVisible();
    await expect(page.getByTestId("room-code")).toHaveText(roomCode);

    const bob = await browser.newPage();
    await joinRoom(bob, roomCode, "Bob");

    await expect(page.getByText("Bob")).toBeVisible();
    await expect(bob.getByText("Alice")).toBeVisible();
    await expect(page.getByTestId("waiting-banner")).toBeHidden();
    await bob.close();
  });

  test("shows a not found state for invalid room links", async ({ page }) => {
    await page.goto("/room/zzzz-zzzz");
    await expect(page.getByRole("heading", { name: /room not found/i })).toBeVisible();
  });

  test("blocks a third participant when the room is already full", async ({ browser, page }) => {
    const roomCode = await createRoom(page, { displayName: "Alice" });
    const bob = await browser.newPage();
    await joinRoom(bob, roomCode, "Bob");

    const charlie = await browser.newPage();
    await charlie.goto(`/room/${roomCode}`);
    await expect(charlie.getByRole("heading", { name: /this room is full/i })).toBeVisible();

    await bob.close();
    await charlie.close();
  });

  test("reconnects after refresh and restores the active problem and editor state", async ({
    browser,
    page,
  }) => {
    const roomCode = await createRoom(page, { displayName: "Alice" });
    const bob = await browser.newPage();
    await joinRoom(bob, roomCode, "Bob");

    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await expect.poll(() => readEditorCode(page)).toContain("def twoSum");
    await setEditorCode(
      page,
      "class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:pass-all\n        return [0, 1]\n",
    );

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/room/${roomCode}/session/solve$`));
    await expect(page.getByTestId("problem-title")).toHaveText("Two Sum");
    await expect(page.getByTestId("waiting-banner")).toBeHidden();
    await expect(page.getByText("Bob")).toBeVisible();
    await expect
      .poll(() => readEditorCode(page))
      .toContain("codeshare-stub:pass-all");

    await bob.close();
  });

  test("does not reclaim a slot after grace expiry once another participant takes it", async ({
    browser,
    page,
  }) => {
    const roomCode = await createRoom(page, { displayName: "Alice" });
    const bob = await browser.newPage();
    await joinRoom(bob, roomCode, "Bob");

    const sessionState = await captureSessionState(page);
    await page.close();
    await bob.waitForTimeout(1_800);

    const charlie = await browser.newPage();
    await charlie.addInitScript(() => {
      window.sessionStorage.setItem("displayName", "Charlie");
    });
    await charlie.goto(`/room/${roomCode}/session`);
    await expect(charlie.getByText("Charlie")).toBeVisible();

    const aliceRejoin = await openSessionPage(browser, roomCode, {
      sessionState,
    });
    await expect
      .poll(async () => {
        return (
          (await aliceRejoin.getByTestId("room-error-banner").isVisible().catch(() => false)) ||
          (await aliceRejoin.getByTestId("reconnecting-banner").isVisible().catch(() => false)) ||
          (await aliceRejoin.getByTestId("waiting-banner").isVisible().catch(() => false))
        );
      })
      .toBe(true);

    await bob.close();
    await charlie.close();
    await aliceRejoin.close();
  });
});
