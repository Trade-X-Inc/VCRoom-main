import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  const env: Record<string, string> = {};
  for (const line of lines) {
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

const SUPABASE_URL = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = `sb-ldimninnjlvxozubheib-auth-token`;
const APP_URL = process.env.R12_TEST_BASE_URL || "https://hockystick.app";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASSWORD = testEnv.TEST_FOUNDER_PASSWORD;
const FOUNDER_USER_ID = testEnv.TEST_FOUNDER_USER_ID;

function adminHeaders() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
}

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: adminHeaders(), body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, session }: { key: string; session: any }) => {
      localStorage.setItem(key, JSON.stringify({
        access_token: session.access_token, refresh_token: session.refresh_token,
        expires_in: session.expires_in, expires_at: session.expires_at,
        token_type: session.token_type, user: session.user,
      }));
    },
    { key: STORAGE_KEY, session },
  );
  await page.close();
}

// R12B step 3 — confirms notifications' realtime subscription now fires
// (table added to publication in step 1), BEFORE reducing its 30s polling
// fallback. Must pass before the polling interval is touched.
test("Notification appears in an open session live, well under the 30s poll interval", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  const context = await browser.newContext();
  const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASSWORD);
  await injectSession(context, session);
  const page = await context.newPage();

  await page.goto(`${APP_URL}/app`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const uniqueTitle = `R12B notif test ${Date.now()}`;
  const sentAt = Date.now();

  const insertRes = await request.post(`${SUPABASE_URL}/rest/v1/notifications`, {
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    data: { user_id: FOUNDER_USER_ID, title: uniqueTitle, body: "R12B live test", kind: "system", read: false },
  });
  expect(insertRes.ok()).toBeTruthy();

  await page.getByRole("button", { name: "Notifications" }).click();
  await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 20_000 });
  const observedLatencyMs = Date.now() - sentAt;
  console.log(`[R12B] Notifications realtime observed latency: ${observedLatencyMs}ms (poll fallback is 30000ms)`);
  expect(observedLatencyMs).toBeLessThan(29_000);

  await context.close();
});
