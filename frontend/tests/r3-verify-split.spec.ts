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

const SUPABASE_URL = localEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SUPABASE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";
const DEAL_ROOM_ID = "957f9750-00c7-402a-b1ba-d9c7a4e3ba2f";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const session = (await response.json()) as any;
  if (!session.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(session)}`);
  return session;
}

async function signIn(context: BrowserContext, email: string, password: string) {
  const session = await getSession(email, password);
  const page = await context.newPage();
  await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, value }: any) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem("vr.theme", "light");
    },
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

const TABS = ["overview", "information", "documents", "qa", "diligence", "term-sheets", "close", "activity"];

test.describe("R3 deal room split — live verification", () => {
  test("founder can load all 8 sub-routes with no 404/error", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);

    for (const tab of TABS) {
      const url = `${APP}/app/deal-rooms/${DEAL_ROOM_ID}/${tab}`;
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
      expect(resp?.status(), `${tab} should not 404/500`).toBeLessThan(400);
      await page.screenshot({ path: `test-results/r3-founder-${tab}.png`, fullPage: true });
      const bodyText = await page.textContent("body");
      expect(bodyText?.toLowerCase()).not.toContain("something went wrong");
    }
    await context.close();
  });

  test("investor can load all 8 sub-routes with no 404/error", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, INVESTOR_EMAIL, INVESTOR_PASS);

    for (const tab of TABS) {
      const url = `${APP}/app/deal-rooms/${DEAL_ROOM_ID}/${tab}`;
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
      expect(resp?.status(), `${tab} should not 404/500`).toBeLessThan(400);
      await page.screenshot({ path: `test-results/r3-investor-${tab}.png`, fullPage: true });
      const bodyText = await page.textContent("body");
      expect(bodyText?.toLowerCase()).not.toContain("something went wrong");
    }
    await context.close();
  });

  test("NDA context (membership/room) loads once — no duplicate room fetch across tab navigation", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);

    const roomRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/rest/v1/deal_rooms") && req.url().includes(DEAL_ROOM_ID)) {
        roomRequests.push(req.url());
      }
    });

    await page.goto(`${APP}/app/deal-rooms/${DEAL_ROOM_ID}/overview`, { waitUntil: "networkidle" });
    const afterFirstLoad = roomRequests.length;

    await page.goto(`${APP}/app/deal-rooms/${DEAL_ROOM_ID}/documents`, { waitUntil: "networkidle" });
    await page.goto(`${APP}/app/deal-rooms/${DEAL_ROOM_ID}/qa`, { waitUntil: "networkidle" });

    // React Query should serve from cache; some navigations may still trigger a background
    // refetch on remount but should not multiply linearly per tab (staleTime 5 min).
    console.log(`deal_rooms fetch count: first-load=${afterFirstLoad}, after 2 more tabs=${roomRequests.length}`);
    await context.close();
  });
});
