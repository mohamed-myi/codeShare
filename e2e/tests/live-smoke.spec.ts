import { expect, test } from "@playwright/test";
import {
  createRoom,
  goToProblems,
  goToSolver,
  importProblem,
  resetTestState,
} from "../support/app";

test.describe("@live MVP external provider smoke", () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_LIVE, "Live smoke only runs in PLAYWRIGHT_LIVE mode.");
    await resetTestState(request);
  });

  test("imports a live LeetCode problem and requests a live AI hint", async ({ page }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await importProblem(page, "https://leetcode.com/problems/two-sum/");
    await goToSolver(page);
    await expect(page.getByTestId("problem-title")).toBeVisible();
    await page.getByRole("button", { name: /request hint/i }).click();
    await expect(page.getByTestId("hint-output")).toBeVisible();
  });
});
