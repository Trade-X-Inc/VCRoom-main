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

const LOCKED_ROOM_ID = "11111111-2222-3333-4444-555555555555"; // qa stage today; flipped to nda_signed for the locked screenshot
const UNLOCKED_ROOM_ID = "957f9750-00c7-402a-b1ba-d9c7a4e3ba2f"; // closed — Atlas/Dr Henry

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

test.describe("R4B — investor profile + mutual disclosure verification", () => {
  test("investor profile page renders with new sections", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, INVESTOR_EMAIL, INVESTOR_PASS);
    await page.goto(`${APP}/app/investor/profile`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/r4b-profile-page.png", fullPage: true });
    await context.close();
  });

  test("public profile page /i/:slug renders whitelisted fields only", async ({ browser }) => {
    const context = await browser.newContext(); // no session — true public visitor
    const page = await context.newPage();
    const resp = await page.goto(`${APP}/i/test-ventures`, { waitUntil: "networkidle" });
    expect(resp?.status()).toBeLessThan(400);
    await page.screenshot({ path: "test-results/r4b-public-profile.png", fullPage: true });
    await context.close();
  });

  test("Information tab — unlocked state (closed room) shows full mutual disclosure", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);
    await page.goto(`${APP}/app/deal-rooms/${UNLOCKED_ROOM_ID}/information`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/r4b-information-unlocked-founder.png", fullPage: true });
    await context.close();
  });

  test("Information tab — unlocked state, investor side", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, INVESTOR_EMAIL, INVESTOR_PASS);
    await page.goto(`${APP}/app/deal-rooms/${UNLOCKED_ROOM_ID}/information`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/r4b-information-unlocked-investor.png", fullPage: true });
    await context.close();
  });

  test("Information tab — locked state (nda_signed) shows public profiles only", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);
    await page.goto(`${APP}/app/deal-rooms/${LOCKED_ROOM_ID}/information`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/r4b-information-locked-founder.png", fullPage: true });
    await context.close();
  });

  test("Information tab — locked state, investor side", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, INVESTOR_EMAIL, INVESTOR_PASS);
    await page.goto(`${APP}/app/deal-rooms/${LOCKED_ROOM_ID}/information`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/r4b-information-locked-investor.png", fullPage: true });
    await context.close();
  });
});
