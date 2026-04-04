import { expect, test } from "@playwright/test";
import {
  buildImportedProblemUrl,
  createRoom,
  goToProblems,
  goToSolver,
  importProblem,
  joinRoom,
  readEditorCode,
  resetTestState,
  selectProblem,
  setEditorCode,
  uniqueImportSlug,
} from "../support/app";

test.describe("MVP interview mode flows", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("assigns interviewer and candidate roles and blocks candidate controls", async ({
    browser,
    page,
  }) => {
    const roomCode = await createRoom(page, {
      displayName: "Interviewer",
      mode: "interview",
    });
    const candidate = await browser.newPage();
    await joinRoom(candidate, roomCode, "Candidate");

    await goToProblems(candidate);
    await expect(candidate.getByTestId("problem-option-two-sum")).toBeDisabled();
    await expect(candidate.getByTestId("open-import-dialog")).toHaveCount(0);

    await goToProblems(page);
    await expect(page.getByTestId("problem-option-two-sum")).toBeEnabled();
    await candidate.close();
  });

  test("reveals curated solutions from the interviewer to both users", async ({
    browser,
    page,
  }) => {
    const roomCode = await createRoom(page, {
      displayName: "Interviewer",
      mode: "interview",
    });
    const candidate = await browser.newPage();
    await joinRoom(candidate, roomCode, "Candidate");

    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await expect(page.getByTestId("reveal-solution-button")).toBeEnabled();
    await page.getByTestId("reveal-solution-button").click();

    await expect(page.getByTestId("solution-panel")).toContainText("hash map");
    await goToSolver(candidate);
    await expect(candidate.getByTestId("solution-panel")).toContainText("hash map");
    await candidate.close();
  });

  test("keeps imported problems from exposing a reveal action when no stored solution exists", async ({
    page,
  }) => {
    await createRoom(page, {
      displayName: "Interviewer",
      mode: "interview",
    });
    await goToProblems(page);
    await importProblem(page, buildImportedProblemUrl(uniqueImportSlug("interview-import")));
    await goToSolver(page);

    await expect(page.getByTestId("reveal-solution-button")).toBeDisabled();
  });

  test("still synchronizes collaborative editing in interview mode", async ({ browser, page }) => {
    const roomCode = await createRoom(page, {
      displayName: "Interviewer",
      mode: "interview",
    });
    const candidate = await browser.newPage();
    await joinRoom(candidate, roomCode, "Candidate");

    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await expect.poll(() => readEditorCode(page)).toContain("def twoSum");
    await setEditorCode(
      page,
      "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n",
    );

    await goToSolver(candidate);
    await expect
      .poll(() => readEditorCode(candidate), { timeout: 10_000 })
      .toContain("return [0, 1]");
    await candidate.close();
  });
});
