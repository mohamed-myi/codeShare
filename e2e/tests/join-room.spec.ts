import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Join Room", () => {
  let roomCode: string;

  test.beforeEach(async ({ request }) => {
    const response = await request.post("/api/rooms", {
      data: { mode: "collaboration" },
    });
    const body = await response.json();
    roomCode = body.roomCode;
  });

  test("join page passes a11y audit", async ({ page }) => {
    await page.goto(`/room/${roomCode}`);

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test("displays room info and allows joining", async ({ page }) => {
    await page.goto(`/room/${roomCode}`);

    await expect(page.getByText(roomCode)).toBeVisible();
    await page.getByPlaceholder(/display name/i).fill("Bob");
    await page.getByRole("button", { name: /join/i }).click();

    await expect(page).toHaveURL(new RegExp(`/room/${roomCode}/session`));
  });

  test("shows error for non-existent room", async ({ page }) => {
    await page.goto("/room/zzz-zzz");

    await expect(page.getByText(/not found|does not exist/i)).toBeVisible();
  });
});
