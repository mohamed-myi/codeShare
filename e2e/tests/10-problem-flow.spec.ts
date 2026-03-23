import { expect, test } from "@playwright/test";
import {
  createRoom,
  goToProblems,
  goToSolver,
  joinRoom,
  readEditorCode,
  resetTestState,
  selectProblem,
} from "../support/app";

test.describe("MVP problem flows", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("browses, filters, and selects curated problems", async ({ page }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);

    await page.getByLabel("Search problems").fill("Two Sum");
    await page.getByLabel("Category").selectOption("Arrays & Hashing");
    await page.getByLabel("Difficulty").selectOption("easy");

    await selectProblem(page, "two-sum");
    await expect(page.getByTestId("problem-title")).toHaveText("Two Sum");
    await expect.poll(() => readEditorCode(page)).toContain("def twoSum");
  });

  test("lets either collaborator choose the active problem", async ({ browser, page }) => {
    const roomCode = await createRoom(page, { displayName: "Alice" });
    const bob = await browser.newPage();
    await joinRoom(bob, roomCode, "Bob");

    await goToProblems(bob);
    await selectProblem(bob, "group-anagrams");

    await goToSolver(page);
    await expect(page.getByTestId("problem-title")).toHaveText("Group Anagrams");
    await expect.poll(() => readEditorCode(page)).toContain("def groupAnagrams");

    await bob.close();
  });

  test("confirms problem switches and resets the active code and custom test cases", async ({
    page,
  }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await page.getByTestId("results-tab-testcases").click();
    await page.getByTestId("custom-input-nums").fill("[1,2]");
    await page.getByTestId("custom-input-target").fill("3");
    await page.getByTestId("custom-expected-output").fill("[0,1]");
    await page.getByTestId("add-custom-testcase-button").click();

    await page.getByTestId("toggle-problems-view").click();
    await page.getByTestId("problem-option-group-anagrams").click();
    await expect(page.getByTestId("confirm-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByTestId("problem-title")).toHaveText("Group Anagrams");
    await expect.poll(() => readEditorCode(page)).toContain("def groupAnagrams");
    await page.getByTestId("results-tab-testcases").click();
    await expect(page.getByText("Custom 1")).toHaveCount(0);
  });

  test("disables problem switching while an execution is in progress", async ({ page, request }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await expect.poll(() => readEditorCode(page)).toContain("def twoSum");
    await request.post("http://127.0.0.1:4100/__scenario", {
      data: { judge0: { delayMs: 1_000 } },
    });
    await page.evaluate(() => {
      window.__codeshareEditor?.setValue(
        "class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:pass-all\n        return [0, 1]\n",
      );
    });

    await page.getByTestId("run-code-button").click();
    await expect(page.getByTestId("execution-running-state")).toBeVisible();
    await page.getByTestId("toggle-problems-view").click();
    await expect(page.getByTestId("problem-option-group-anagrams")).toBeDisabled();
  });
});
