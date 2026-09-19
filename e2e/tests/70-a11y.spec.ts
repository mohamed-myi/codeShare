import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import {
  buildImportedProblemUrl,
  createRoom,
  goToProblems,
  goToSolver,
  importProblem,
  joinRoom,
  resetTestState,
  selectProblem,
  uniqueImportSlug,
} from "../support/app";

async function waitForAnimations(page: Page) {
  // Opening a dialog can cancel an outgoing transition and reject its finished promise.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => !animation.pending && animation.playState !== "running"),
  );
}

function scanPage(page: Page) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
}

test("animation readiness tolerates cancelled transitions", async ({ page }) => {
  await page.setContent('<button id="animated">Example</button>');
  await page.evaluate(() => {
    const animation = document.getElementById("animated")?.animate({ opacity: [0, 1] }, 10_000);
    setTimeout(() => animation?.cancel(), 100);
  });
  await waitForAnimations(page);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test.describe("MVP accessibility smoke", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("home, join, solver, and import dialog are free of obvious axe violations", async ({
    browser,
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("home-page").waitFor();
    await waitForAnimations(page);
    expect((await scanPage(page)).violations).toEqual([]);

    const roomCode = await createRoom(page, { displayName: "Alice" });
    const joinCtx = await browser.newContext();
    const joinPage = await joinCtx.newPage();
    await joinPage.goto(`/room/${roomCode}`);
    await joinPage.getByTestId("join-room-button").waitFor();
    await waitForAnimations(joinPage);
    expect((await scanPage(joinPage)).violations).toEqual([]);

    await goToProblems(page);
    await selectProblem(page, "two-sum");
    await waitForAnimations(page);
    expect((await scanPage(page)).violations).toEqual([]);

    await page.getByTestId("solver-import-button").click();
    await waitForAnimations(page);
    expect((await scanPage(page)).violations).toEqual([]);

    await joinCtx.close();
  });

  test("keeps hint consent UI accessible when it appears", async ({ browser, page }) => {
    const roomCode = await createRoom(page, { displayName: "Alice" });
    const bobCtx = await browser.newContext();
    const bob = await bobCtx.newPage();
    await joinRoom(bob, roomCode, "Bob");

    await goToProblems(page);
    await importProblem(page, buildImportedProblemUrl(uniqueImportSlug("a11y-hint")));
    await goToSolver(page);
    await goToSolver(bob);
    await page.getByTestId("request-hint-button").click();

    await bob.getByTestId("hint-consent-card").waitFor();
    await waitForAnimations(bob);
    expect((await scanPage(bob)).violations).toEqual([]);
    await bobCtx.close();
  });
});
