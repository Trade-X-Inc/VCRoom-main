import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const testEnv = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL = localEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SUPABASE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = process.env.PLAYWRIGHT_BASE_URL || "https://hockystick.app";
const DEAL_ROOM_ID = "957f9750-00c7-402a-b1ba-d9c7a4e3ba2f";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL || "test-founder@hockystick.app";
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL || "drhenry10th@gmail.com";
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password?: string) {
  if (!SUPABASE_KEY) throw new Error("Missing Supabase key in frontend/.env.local");
  if (!password) throw new Error(`Missing password for ${email} in .env.test`);

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const session = await response.json() as any;
  if (!session.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(session)}`);
  return session;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, value, themeKey }: any) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(themeKey, "light");
      localStorage.setItem("hs_ai_panel_open", "false");
    },
    {
      key: STORAGE_KEY,
      themeKey: "vr.theme",
      value: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      },
    },
  );
  await page.close();
}

async function openDealRoom(context: BrowserContext, email: string, password?: string) {
  await injectSession(context, await getSession(email, password));
  const page = await context.newPage();
  await page.goto(`${APP}/app/deal-room/${DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
  await waitForDealRoom(page);
  return page;
}

async function waitForDealRoom(page: Page) {
  await page.waitForFunction(
    () =>
      !document.body.textContent?.includes("Verifying access") &&
      !document.body.textContent?.includes("Signing you in") &&
      !document.body.textContent?.includes("Loading…"),
    { timeout: 30000 },
  );
}

test.describe("Deal room DR-0", () => {
  test("1. Deal room loads for founder", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await openDealRoom(context, FOUNDER_EMAIL, FOUNDER_PASS);

    await expect(page.getByTestId("stage-pill-overview")).toBeVisible();
    await expect(page.getByTestId("stage-pill-information_vault")).toBeVisible();
    await expect(page.getByText("Application error")).toHaveCount(0);

    await context.close();
  });

  test("2. Overview tab shows company data", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await openDealRoom(context, FOUNDER_EMAIL, FOUNDER_PASS);

    await page.getByTestId("stage-pill-overview").click();
    await expect(page.getByText("ATLAS ROBOTICS").first()).toBeVisible();
    await expect(page.getByText("TRACTION METRICS")).toBeVisible();
    await expect(page.getByText("RECENT ACTIVITY")).toBeVisible();

    await context.close();
  });

  test("3. Stage progress bar visible", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await openDealRoom(context, FOUNDER_EMAIL, FOUNDER_PASS);

    await expect(page.getByTestId("stage-progress-bar")).toBeVisible();
    await expect(page.getByTestId("stage-progress-dot-overview")).toBeVisible();
    await expect(page.getByRole("button", { name: /Request next stage/i })).toBeVisible();

    await context.close();
  });

  test("4. Investor sees deal room", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await openDealRoom(context, INVESTOR_EMAIL, INVESTOR_PASS);

    await expect(page.getByTestId("stage-pill-overview")).toBeVisible();
    await expect(page.getByText("ATLAS ROBOTICS").first()).toBeVisible();

    await context.close();
  });
});
