import { expect, test, type Browser } from "@playwright/test";
import {
  buildImportedProblemUrl,
  createRoom,
  getStubJournal,
  goToProblems,
  goToSolver,
  importedProblemTitle,
  importProblem,
  resetTestState,
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

test.describe("MVP import flows", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("imports a LeetCode problem and shows source attribution", async ({ page, request }) => {
    const slug = uniqueImportSlug("e2e-import");
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await importProblem(page, buildImportedProblemUrl(slug));

    await goToSolver(page);
    await expect(page.getByTestId("problem-title")).toHaveText(importedProblemTitle(slug));
    await expect(page.getByText(/problem sourced from/i)).toBeVisible();

    const journal = await getStubJournal(request);
    expect(journal.leetcode).toHaveLength(1);
    expect(journal.leetcode[0].slug).toBe(slug);
  });

  test("persists imported problems for fresh rooms and sessions", async ({ browser, page }) => {
    const slug = uniqueImportSlug("e2e-persisted");
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);
    await importProblem(page, buildImportedProblemUrl(slug));
    await goToSolver(page);
    await expect(page.getByTestId("problem-title")).toHaveText(importedProblemTitle(slug));

    const secondRoom = await browser.newPage();
    await createRoom(secondRoom, { displayName: "Bob" });
    await goToProblems(secondRoom);
    await secondRoom.getByLabel("Search problems").fill(importedProblemTitle(slug));
    await expect(secondRoom.getByTestId(`problem-option-${slug}`)).toBeVisible();
    await secondRoom.close();
  });

  test("gates the per-room and global import limits", async ({ browser, page }) => {
    const roomSlugs = [
      uniqueImportSlug("room-cap-1"),
      uniqueImportSlug("room-cap-2"),
      uniqueImportSlug("room-cap-3"),
      uniqueImportSlug("room-cap-4"),
    ];
    await createRoom(page, { displayName: "Alice" });
    await goToProblems(page);

    for (const slug of roomSlugs.slice(0, 3)) {
      await importProblem(page, buildImportedProblemUrl(slug));
      await goToProblems(page);
    }
    await importProblem(page, buildImportedProblemUrl(roomSlugs[3]));
    await expect(page.getByTestId("import-status-message")).toContainText("Session import limit");

    for (let roomIndex = 0; roomIndex < 3; roomIndex += 1) {
      const { context, page: extraRoom } = await openPageForForwardedIp(
        browser,
        `198.51.100.${roomIndex + 10}`,
      );
      await createRoom(extraRoom, { displayName: `User ${roomIndex}` });
      await goToProblems(extraRoom);
      for (let importIndex = 0; importIndex < 3; importIndex += 1) {
        const slug = uniqueImportSlug(`global-cap-${roomIndex}-${importIndex}`);
        await importProblem(extraRoom, buildImportedProblemUrl(slug));
        if (importIndex < 2) {
          await goToProblems(extraRoom);
        }
      }
      await context.close();
    }

    const { context: finalContext, page: finalRoom } = await openPageForForwardedIp(
      browser,
      "198.51.100.250",
    );
    await createRoom(finalRoom, { displayName: "Global Limit" });
    await goToProblems(finalRoom);
    await importProblem(finalRoom, buildImportedProblemUrl(uniqueImportSlug("global-cap-overflow")));
    await expect(finalRoom.getByTestId("import-status-message")).toContainText(
      "Daily import limit reached",
    );
    await finalContext.close();
  });
});
