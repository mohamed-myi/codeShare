import { type APIRequestContext, type Browser, expect, type Page } from "@playwright/test";
import { ROOM_CODE } from "../../packages/shared/src/constants.ts";

const ROOM_URL_RE = new RegExp(
  `/room/([${ROOM_CODE.ALPHABET}]{${ROOM_CODE.SEGMENT_LENGTH}}-[${ROOM_CODE.ALPHABET}]{${ROOM_CODE.SEGMENT_LENGTH}})/session(?:/solve)?$`,
);
export const clientOrigin =
  process.env.E2E_CLIENT_ORIGIN ?? `http://127.0.0.1:${process.env.E2E_CLIENT_PORT ?? "5173"}`;
export const stubUrl = process.env.E2E_STUB_URL ?? "http://127.0.0.1:4100";
export const serverUrl = process.env.E2E_SERVER_URL ?? "http://127.0.0.1:3001";

export type RoomMode = "collaboration" | "interview";

const ROOM_MODE_LABEL: Record<RoomMode, string> = {
  collaboration: "Collaboration",
  interview: "Mock Interview",
};

export async function resetTestState(request: APIRequestContext): Promise<void> {
  await request.post(`${serverUrl}/api/test/reset`);
  await request.post(`${stubUrl}/__reset`);
}

export async function setStubScenario(
  request: APIRequestContext,
  scenario: Record<string, unknown>,
): Promise<void> {
  await request.post(`${stubUrl}/__scenario`, { data: scenario });
}

export async function getStubJournal(request: APIRequestContext) {
  const response = await request.get(`${stubUrl}/__journal`);
  return response.json();
}

export async function selectFilterOption(
  page: Page,
  label: "Category" | "Difficulty",
  option: string,
): Promise<void> {
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: option }).click();
}

export async function createRoom(
  page: Page,
  options: { displayName: string; mode?: RoomMode },
): Promise<string> {
  const mode = options.mode ?? "collaboration";

  await page.goto("/");
  await page.getByLabel("Display name").fill(options.displayName);
  if (mode !== "collaboration") {
    await page.getByLabel("Room mode").click();
    await page.getByRole("option", { name: ROOM_MODE_LABEL[mode] }).click();
  }
  await page.getByTestId("create-room-button").click();
  await expect(page).toHaveURL(ROOM_URL_RE);
  return extractRoomCode(page.url());
}

export async function joinRoom(page: Page, roomCode: string, displayName: string): Promise<void> {
  await page.goto(`/room/${roomCode}`);
  await expect(page.getByRole("heading", { name: /join room/i })).toBeVisible();
  await page.getByLabel("Display name").fill(displayName);
  await page.getByTestId("join-room-button").click();
  await expect(page).toHaveURL(new RegExp(`/room/${roomCode}/session$`));
}

export async function openSessionPage(
  browser: Browser,
  roomCode: string,
  options: {
    displayName?: string;
    sessionState?: Record<string, string>;
  },
): Promise<Page> {
  const page = await browser.newPage();
  await page.addInitScript(
    (sessionState) => {
      for (const [key, value] of Object.entries(sessionState)) {
        window.sessionStorage.setItem(key, value);
      }
    },
    options.sessionState ?? { displayName: options.displayName ?? "Guest" },
  );
  await page.goto(`/room/${roomCode}/session`);
  await expect(page).toHaveURL(new RegExp(`/room/${roomCode}/session$`));
  return page;
}

export async function captureSessionState(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const entries: Record<string, string> = {};
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key) {
        continue;
      }
      const value = window.sessionStorage.getItem(key);
      if (value !== null) {
        entries[key] = value;
      }
    }
    return entries;
  });
}

export async function goToProblems(page: Page): Promise<void> {
  if (page.url().endsWith("/solve")) {
    await page.getByTestId("toggle-problems-view").click();
  }
  await expect(page.getByTestId("problems-page")).toBeVisible();
}

export async function goToSolver(page: Page): Promise<void> {
  if (!page.url().endsWith("/solve")) {
    await page.getByTestId("toggle-problems-view").click();
  }
  await expect(page.getByTestId("solver-page")).toBeVisible();
}

export async function selectProblem(
  page: Page,
  slug: string,
  options: { confirmSwitch?: boolean } = {},
): Promise<void> {
  const locator = page.getByTestId(`problem-option-${slug}`);
  await expect(locator).toBeVisible();
  await locator.click();
  if (options.confirmSwitch) {
    await expect(page.getByTestId("confirm-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
  }
  await expect(page).toHaveURL(/\/solve$/);
}

export async function setEditorCode(page: Page, code: string): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__codeshareEditor));
  await page.evaluate((value) => {
    window.__codeshareEditor?.setValue(value);
  }, code);
  await page.waitForTimeout(1000);
}

export async function readEditorCode(page: Page): Promise<string> {
  await page.waitForFunction(() => Boolean(window.__codeshareEditor));
  return page.evaluate(() => window.__codeshareEditor?.getValue() ?? "");
}

export async function openImportDialog(page: Page): Promise<void> {
  if (page.url().endsWith("/solve")) {
    await page.getByTestId("solver-import-button").click();
  } else {
    await page.getByTestId("open-import-dialog").click();
  }
  await expect(page.getByTestId("import-dialog")).toBeVisible();
}

export async function importProblem(page: Page, url: string): Promise<void> {
  await openImportDialog(page);
  await page.getByTestId("import-url-input").fill(url);
  await page.getByTestId("submit-import-button").click();
  const dialog = page.getByTestId("import-dialog");
  await Promise.race([
    dialog.waitFor({ state: "hidden" }),
    page.getByTestId("import-status-message").waitFor({ state: "visible" }),
  ]);
  await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);

  const succeeded = await page
    .getByTestId("import-status-message")
    .textContent({ timeout: 2_000 })
    .then((value) => value?.includes("Problem imported and loaded.") ?? false)
    .catch(() => false);
  if (succeeded && (await dialog.isVisible().catch(() => false))) {
    await page
      .getByRole("button", { name: /close import dialog/i })
      .click({ timeout: 2_000 })
      .catch(() => undefined);
    await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
  }
}

export async function addCustomTestCase(
  page: Page,
  input: Record<string, string>,
  expectedOutput: string,
): Promise<void> {
  await page.getByTestId("results-tab-testcases").click();
  await expect(page.getByTestId("custom-testcase-form")).toBeVisible();
  for (const [name, value] of Object.entries(input)) {
    await page.getByTestId(`custom-input-${name}`).fill(value);
  }
  await page.getByTestId("custom-expected-output").fill(expectedOutput);
  await page.getByTestId("add-custom-testcase-button").click();
}

export function buildImportedProblemUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

export function importedProblemTitle(slug: string): string {
  return `Imported ${slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")}`.trim();
}

export function uniqueImportSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function extractRoomCode(url: string): string {
  const match = url.match(ROOM_URL_RE);
  if (!match) {
    throw new Error(`Could not extract room code from URL: ${url}`);
  }
  return match[1];
}
