import { expect, test } from "@playwright/test";
import { createRoom, resetTestState } from "../support/app";

test.describe("solo problem selection", () => {
  test.beforeEach(async ({ request }) => {
    await resetTestState(request);
  });

  test("waits for join completion before enabling selection, then navigates to solver", async ({
    page,
    request: _request,
  }) => {
    await page.addInitScript(() => {
      (
        window as typeof window & {
          __codeshareTestControls?: { joinAckDelayMs?: number };
        }
      ).__codeshareTestControls = { joinAckDelayMs: 1_000 };
    });

    const roomCode = await createRoom(page, { displayName: "Alice" });
    const problemOption = page.getByTestId("problem-option-two-sum");

    await expect(problemOption).toBeVisible();
    await expect(problemOption).toBeDisabled();
    await expect(page.getByTestId("joining-room-message")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/room/${roomCode}/session$`));

    await expect(problemOption).toBeEnabled();
    await expect(page.getByTestId("joining-room-message")).toBeHidden();

    await problemOption.click();

    await expect(page).toHaveURL(new RegExp(`/room/${roomCode}/session/solve$`));
    await expect(page.getByTestId("problem-title")).toHaveText("Two Sum");
  });
});
