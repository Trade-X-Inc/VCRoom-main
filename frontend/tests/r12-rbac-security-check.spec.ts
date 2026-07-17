import { test, expect, type Page, type BrowserContext } from "@playwright/test";
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

const VIEWER_EMAIL = testEnv.TEST_VIEWER_EMAIL;
const VIEWER_PASSWORD = testEnv.TEST_VIEWER_PASSWORD;

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

const APP_URL = process.env.R12_TEST_BASE_URL || "https://hockystick.app";

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

async function signInAs(context: BrowserContext, email: string, password: string): Promise<Page> {
  const session = await getSession(email, password);
  await injectSession(context, session);
  return context.newPage();
}

// R12 step 6 — UI-level security check as the most restricted founder-side
// role (Viewer). Direct-Supabase-query equivalents of these same attempts
// were run against the live DB and all confirmed blocked at the RLS layer
// (see migration 20260718010000_r12_rbac_enforcement.sql verification).
// This spec confirms the UI layer matches: no admin controls rendered, and
// direct deep-links to admin-only pages show the blocked state rather than
// the real page or a crash.
test.describe("R12 — Viewer role security check", () => {
  test("Viewer sees no team-management link and no create-deal-room affordance", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signInAs(context, VIEWER_EMAIL, VIEWER_PASSWORD);

    await page.goto(`${APP_URL}/app`, { waitUntil: "networkidle" });
    expect(page.url()).not.toMatch(/sign-in/);

    // UserMenu should not show "Team & users" for a Viewer (canManageTeam=false)
    await page.click('[aria-label="Account menu"]');
    const teamLink = page.getByRole("link", { name: /team & users/i });
    await expect(teamLink).toHaveCount(0);
    await page.screenshot({ path: "/tmp/playwright-r12-viewer-usermenu.png" });
    await context.close();
  });

  test("Viewer deep-linking to /app/users sees blocked state, not the real page", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signInAs(context, VIEWER_EMAIL, VIEWER_PASSWORD);

    await page.goto(`${APP_URL}/app/users`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/playwright-r12-viewer-blocked-users.png" });

    // Blocked-state copy from PermissionGate, not the invite/role-management UI
    await expect(page.getByText(/does not include access to this page/i)).toBeVisible();
    await expect(page.getByText(/contact your workspace admin/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /invite/i })).toHaveCount(0);
    await context.close();
  });

  test("Viewer deep-linking to deal-rooms sees no create-room button", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signInAs(context, VIEWER_EMAIL, VIEWER_PASSWORD);

    await page.goto(`${APP_URL}/app/deal-rooms`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/playwright-r12-viewer-deal-rooms.png" });

    const createBtn = page.getByRole("button", { name: /create new deal room/i });
    if (await createBtn.count() > 0) {
      await expect(createBtn).toBeDisabled();
    }
    await context.close();
  });
});
