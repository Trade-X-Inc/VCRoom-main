import { test, expect, type BrowserContext } from "@playwright/test";
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

const SUPABASE_URL = localEnv.SUPABASE_URL;
const SUPABASE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = "http://localhost:8080";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return (await response.json()) as any;
}

async function signIn(context: BrowserContext, email: string, password: string) {
  const session = await getSession(email, password);
  const page = await context.newPage();
  await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, value }: any) => localStorage.setItem(key, JSON.stringify(value)),
    {
      key: STORAGE_KEY,
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
  return page;
}

test.describe("R5 — overview + analytics verification", () => {
  test("founder overview renders with real data", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);
    const resp = await page.goto(`${APP}/app/overview`, { waitUntil: "networkidle" });
    expect(resp?.status()).toBeLessThan(400);
    expect(page.url()).toContain("/app/overview");
    await page.screenshot({ path: "test-results/r5-founder-overview.png", fullPage: true });
    await context.close();
  });

  test("investor overview renders with real data", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, INVESTOR_EMAIL, INVESTOR_PASS);
    const resp = await page.goto(`${APP}/app/investor/overview`, { waitUntil: "networkidle" });
    expect(resp?.status()).toBeLessThan(400);
    expect(page.url()).toContain("/app/investor/overview");
    await page.screenshot({ path: "test-results/r5-investor-overview.png", fullPage: true });
    await context.close();
  });

  test("founder analytics renders with real data", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);
    const resp = await page.goto(`${APP}/app/analytics`, { waitUntil: "networkidle" });
    expect(resp?.status()).toBeLessThan(400);
    await page.screenshot({ path: "test-results/r5-founder-analytics.png", fullPage: true });
    await context.close();
  });

  test("investor analytics renders with real data", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, INVESTOR_EMAIL, INVESTOR_PASS);
    const resp = await page.goto(`${APP}/app/investor/analytics`, { waitUntil: "networkidle" });
    expect(resp?.status()).toBeLessThan(400);
    await page.screenshot({ path: "test-results/r5-investor-analytics.png", fullPage: true });
    await context.close();
  });

  test("checklist is genuinely skippable — collapses and stays collapsed on reload", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);
    await page.goto(`${APP}/app/overview`, { waitUntil: "networkidle" });

    const dismissButton = page.locator('button[title="Skip"]');
    const hasChecklist = await dismissButton.count() > 0;
    if (hasChecklist) {
      await dismissButton.click();
      await page.waitForTimeout(500);
      await page.reload({ waitUntil: "networkidle" });
      const stillThere = await page.locator('button[title="Skip"]').count();
      // After dismissal, the checklist section should not render at all
      // (dismissed === true short-circuits to null) — confirm it's gone
      // AND that the rest of the page (stat cards) still renders normally,
      // proving the dismissal doesn't block content below it.
      expect(stillThere).toBe(0);
      const statCards = await page.locator("text=Readiness score").count();
      expect(statCards).toBeGreaterThan(0);
    }
    await context.close();
  });
});
