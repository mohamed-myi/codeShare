import { expect, test } from "@playwright/test";
import {
  addCustomTestCase,
  createRoom,
  goToProblems,
  goToSolver,
  joinRoom,
  readEditorCode,
  resetTestState,
  selectProblem,
  setEditorCode,
  setStubScenario,
} from "../support/app";

test.describe("MVP execution flows", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("runs visible and custom test cases together", async ({ page }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await expect.poll(() => readEditorCode(page)).toContain("def twoSum");
    await setEditorCode(
      page,
      "class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:pass-all\n        return [0, 1]\n",
    );
    await addCustomTestCase(page, { nums: "[1,2]", target: "3" }, "[0,1]");

    await page.getByTestId("run-code-button").click();
    await expect(page.getByTestId("results-panel")).toContainText("4/4 passed");
  });

  test("submits against hidden cases and redacts hidden failure details", async ({ page }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await expect.poll(() => readEditorCode(page)).toContain("def twoSum");
    await setEditorCode(
      page,
      "class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:fail-case-3\n        return [0, 1]\n",
    );

    await page.getByTestId("submit-code-button").click();
    await expect(page.getByTestId("results-panel")).toContainText("7/8 passed");
    await expect(page.getByTestId("results-panel")).toContainText("hidden test case");
    await expect(page.getByTestId("results-panel")).not.toContainText("[1,5,3,7]");
  });

  test("broadcasts the same execution lifecycle to both participants", async ({
    browser,
    page,
    request,
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
    await setStubScenario(request, { judge0: { delayMs: 750 } });

    await goToSolver(bob);
    await page.getByTestId("run-code-button").click();

    await expect(page.getByTestId("execution-running-state")).toBeVisible();
    await expect(bob.getByTestId("execution-running-state")).toBeVisible();
    await expect(page.getByTestId("results-panel")).toContainText("3/3 passed");
    await expect(bob.getByTestId("results-panel")).toContainText("3/3 passed");

    await bob.close();
  });

  test("surfaces compilation, runtime, timeout, and upstream API failures", async ({
    page,
    request,
  }) => {
    const cases = [
      { marker: "compile-error", expected: "SyntaxError" },
      { marker: "runtime-error", expected: "RuntimeError" },
      { marker: "timeout", expected: "Time limit exceeded" },
      { marker: "api-error", expected: "Judge0 API error: 500" },
    ];

    for (const [index, item] of cases.entries()) {
      await resetTestState(request);
      await createRoom(page, { displayName: `Alice ${index}` });
      await goToProblems(page);
      await selectProblem(page, "two-sum");
      await expect.poll(() => readEditorCode(page)).toContain("def twoSum");
      await setEditorCode(
        page,
        `class Solution:\n    def twoSum(self, nums, target):\n        # codeshare-stub:${item.marker}\n        return [0, 1]\n`,
      );
      await page.getByTestId("run-code-button").click();
      await expect(page.getByTestId("room-error-banner")).toContainText(item.expected);
      await expect(page.getByTestId("run-code-button")).toBeEnabled();
    }
  });
});
