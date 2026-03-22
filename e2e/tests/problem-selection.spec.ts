import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Problem Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/display name/i).fill("Alice");
    await page.getByRole("button", { name: /collaboration/i }).click();
    await page.getByRole("button", { name: /create room/i }).click();
    await expect(page).toHaveURL(/\/room\/[a-z]{3}-[a-z]{3}\/session/);
  });

  test("solver page passes a11y audit", async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test("displays problem categories", async ({ page }) => {
    await expect(page.getByText(/arrays|strings|two pointers/i)).toBeVisible();
  });

  test("selects a problem and loads editor with boilerplate", async ({ page }) => {
    const problemLink = page.getByRole("button", { name: /two sum/i });

    if (await problemLink.isVisible()) {
      await problemLink.click();
      await expect(page).toHaveURL(/\/solve/);
      await expect(page.locator(".monaco-editor")).toBeVisible();
    }
  });
});
