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

const MEMBER_EMAIL = testEnv.TEST_FOUNDER_MEMBER_EMAIL;
const MEMBER_PASSWORD = testEnv.TEST_FOUNDER_MEMBER_PASSWORD;
const MEMBER_USER_ID = testEnv.TEST_FOUNDER_MEMBER_USER_ID;

function adminHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password }),
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
      const value = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      });
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, session },
  );
  await page.close();
}

// R12 step 4 — a role change by an admin must take effect on the member's
// NEXT DATA FETCH, not next login. This test signs in as the permanent
// test-founder-member@ fixture (Manager role), leaves the tab open, then
// updates their role to Viewer directly via the service-role API (as an
// admin would through app.users.tsx) and confirms the open tab picks up
// the new role via the Realtime subscription in useAccountContext —
// without reloading the page.
test("Role change propagates to an already-open session without reload", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  const context = await browser.newContext();
  const session = await getSession(MEMBER_EMAIL, MEMBER_PASSWORD);
  await injectSession(context, session);
  const page = await context.newPage();

  await page.goto(`${APP_URL}/app`, { waitUntil: "networkidle" });
  await expect(page.getByText(/^manager$/i).first()).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: "/tmp/playwright-r12-realtime-before.png" });

  try {
    // Change role Manager -> Viewer directly via the DB, simulating an
    // admin's action in app.users.tsx, without the member reloading.
    const updateRes = await request.patch(
      `${SUPABASE_URL}/rest/v1/startup_team_accounts?user_id=eq.${MEMBER_USER_ID}`,
      { headers: { ...adminHeaders(), Prefer: "return=representation" }, data: { role: "viewer" } },
    );
    expect(updateRes.ok()).toBeTruthy();

    // No page.reload() — the realtime channel should push this through.
    await expect(page.getByText(/^viewer$/i).first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: "/tmp/playwright-r12-realtime-after.png" });
  } finally {
    // Restore the permanent fixture's role.
    await request.patch(
      `${SUPABASE_URL}/rest/v1/startup_team_accounts?user_id=eq.${MEMBER_USER_ID}`,
      { headers: { ...adminHeaders(), Prefer: "return=representation" }, data: { role: "manager" } },
    );
    await context.close();
  }
});
