import { expect, test } from "@playwright/test";
import { createRoom, goToProblems, resetTestState, selectProblem } from "../support/app";

test.describe("MVP custom test case flows", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("validates JSON before adding a custom test case", async ({ page }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await page.getByTestId("results-tab-testcases").click();

    await page.getByTestId("custom-input-nums").fill("not-json");
    await page.getByTestId("custom-input-target").fill("3");
    await page.getByTestId("custom-expected-output").fill("[0,1]");
    await page.getByTestId("add-custom-testcase-button").click();

    await expect(page.getByText("nums must be valid JSON.")).toBeVisible();
  });

  test("gates the room custom test case cap", async ({ page }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await page.getByTestId("results-tab-testcases").click();

    for (let index = 0; index < 4; index += 1) {
      await page.getByTestId("custom-input-nums").fill("[1,2]");
      await page.getByTestId("custom-input-target").fill("3");
      await page.getByTestId("custom-expected-output").fill("[0,1]");
      await page.getByTestId("add-custom-testcase-button").click();
    }

    await expect(page.getByTestId("room-error-banner")).toContainText("Custom test case limit");
  });
});
