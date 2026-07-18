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
      localStorage.setItem("hs_sidebar_expanded", "1");
    },
    { key: STORAGE_KEY, session },
  );
  await page.close();
}

// R12 step 1 (VERIFY phase) — the sidebar group expand/collapse fix.
// Clicking an L4 child must navigate WITHOUT collapsing its parent L3
// group; the group collapses only via clicking its own label/toggle;
// expanded state persists across navigation within the same L2 section.
test("Sidebar group stays open across child navigation, closes only on its own toggle", async ({ browser }) => {
  const context = await browser.newContext();
  const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASSWORD);
  await injectSession(context, session);
  const page = await context.newPage();

  await page.goto(`${APP_URL}/app/prepare/profile-builder/quick-setup`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/playwright-r12-sidebar-1-initial.png" });

  const groupToggle = page.getByRole("button", { name: /profile builder/i }).first();
  await expect(groupToggle).toBeVisible();

  // Confirm the group is expanded (its children are visible) since we're
  // on one of its own child routes.
  const fullProfileLink = page.getByRole("link", { name: /^full profile$/i });
  await expect(fullProfileLink).toBeVisible();
  await page.screenshot({ path: "/tmp/playwright-r12-sidebar-2-group-expanded.png" });

  // Click a DIFFERENT L4 child within the same group — group must stay open.
  await fullProfileLink.click();
  await page.waitForURL(/full-profile/, { timeout: 10_000 });
  await expect(page.getByRole("link", { name: /^quick setup$/i })).toBeVisible();
  await expect(fullProfileLink).toBeVisible();
  await page.screenshot({ path: "/tmp/playwright-r12-sidebar-3-after-child-nav-still-open.png" });

  // Now click the group's own label/toggle — THIS should collapse it.
  await groupToggle.click();
  await expect(page.getByRole("link", { name: /^quick setup$/i })).toBeHidden();
  await page.screenshot({ path: "/tmp/playwright-r12-sidebar-4-collapsed-via-own-toggle.png" });

  await context.close();
});
