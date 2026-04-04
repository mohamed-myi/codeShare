import { expect, test } from "@playwright/test";
import {
  buildImportedProblemUrl,
  createRoom,
  goToProblems,
  goToSolver,
  importProblem,
  joinRoom,
  resetTestState,
  setStubScenario,
  uniqueImportSlug,
} from "../support/app";

test.describe("MVP hint flows", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
    await setStubScenario(request, {
      groq: {
        chunks: [
          "Consider how to normalize equivalent inputs.",
          " Then group by that representation.",
        ],
      },
    });
  });

  test("shows a collaboration hint request control in the problem panel", async ({ page }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await importProblem(page, buildImportedProblemUrl(uniqueImportSlug("hint-control")));
    await goToSolver(page);

    await expect(page.getByRole("button", { name: /request hint/i })).toBeVisible();
  });

  test("streams AI fallback hints for imported problems", async ({ page }) => {
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await importProblem(page, buildImportedProblemUrl(uniqueImportSlug("hint-fallback")));
    await goToSolver(page);

    await page.getByRole("button", { name: /request hint/i }).click();
    await expect(page.getByTestId("hint-output")).toContainText("normalize equivalent inputs");
  });

  test("requires partner approval before delivering a collaboration hint", async ({
    browser,
    page,
  }) => {
    const roomCode = await createRoom(page, { displayName: "Alice" });
    const bob = await browser.newPage();
    await joinRoom(bob, roomCode, "Bob");

    await goToProblems(page);
    await importProblem(page, buildImportedProblemUrl(uniqueImportSlug("hint-consent")));
    await goToSolver(page);
    await goToSolver(bob);

    await page.getByRole("button", { name: /request hint/i }).click();
    await expect(bob.getByTestId("hint-consent-card")).toBeVisible();
    await bob.getByTestId("approve-hint-button").click();
    await expect(page.getByTestId("hint-output")).toContainText("normalize equivalent inputs");
    await bob.close();
  });

  test("allows denying or timing out a hint request", async ({ browser, page }) => {
    const deniedRoomCode = await createRoom(page, { displayName: "Alice" });
    const bob = await browser.newPage();
    await joinRoom(bob, deniedRoomCode, "Bob");

    await goToProblems(page);
    await importProblem(page, buildImportedProblemUrl(uniqueImportSlug("hint-deny")));
    await goToSolver(page);
    await goToSolver(bob);

    await page.getByRole("button", { name: /request hint/i }).click();
    await bob.getByTestId("deny-hint-button").click();
    await expect(page.getByText(/denied|approval/i)).toBeVisible();
    await bob.close();

    const timeoutPage = await browser.newPage();
    const timedOutRoomCode = await createRoom(timeoutPage, { displayName: "Carol" });
    const dan = await browser.newPage();
    await joinRoom(dan, timedOutRoomCode, "Dan");

    await goToProblems(timeoutPage);
    await importProblem(timeoutPage, buildImportedProblemUrl(uniqueImportSlug("hint-timeout")));
    await goToSolver(timeoutPage);
    await goToSolver(dan);

    await timeoutPage.getByRole("button", { name: /request hint/i }).click();
    await timeoutPage.waitForTimeout(1_700);
    await expect(timeoutPage.getByText(/denied|approval/i)).toBeVisible();
    await dan.close();
    await timeoutPage.close();
  });
});
