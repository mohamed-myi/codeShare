import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Create Room", () => {
  test("home page passes a11y audit", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test("creates a collaboration room and navigates to session", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder(/display name/i).fill("Alice");
    await page.getByRole("button", { name: /collaboration/i }).click();
    await page.getByRole("button", { name: /create room/i }).click();

    await expect(page).toHaveURL(/\/room\/[a-z]{3}-[a-z]{3}\/session/);
  });

  test("creates an interview room and navigates to session", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder(/display name/i).fill("Interviewer");
    await page.getByRole("button", { name: /interview/i }).click();
    await page.getByRole("button", { name: /create room/i }).click();

    await expect(page).toHaveURL(/\/room\/[a-z]{3}-[a-z]{3}\/session/);
  });
});
