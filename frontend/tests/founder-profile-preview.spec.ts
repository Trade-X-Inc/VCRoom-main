/**
 * Playwright test: founder public profile owner-preview gate.
 *
 * test-founder has profile_published=false, publicly_discoverable=false.
 * Their slug is "playwright-test-co".
 *
 * Expected:
 *   1. Owner (signed-in as test-founder) visits /p/playwright-test-co
 *      → full profile renders + amber "Preview mode" banner visible
 *   2. Unauthenticated visitor visits same URL
 *      → "Profile private" shown, no profile content
 */
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

const testEnv  = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL   = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY    = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY    = "sb-ldimninnjlvxozubheib-auth-token";
const FOUNDER_EMAIL  = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS   = testEnv.TEST_FOUNDER_PASSWORD;
const PROFILE_SLUG   = "playwright-test-co";

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
  const data = await res.json() as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto("https://hockystick.app/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, session }: { key: string; session: any }) => {
      localStorage.setItem(key, JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      }));
    },
    { key: STORAGE_KEY, session }
  );
  await page.close();
}

test.describe("Founder public profile — owner preview gate", () => {

  test("1. Owner sees full profile with amber preview banner when unpublished", async ({ browser }) => {
    const context = await browser.newContext();
    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
    await injectSession(context, session);
    const page = await context.newPage();

    await page.goto(`https://hockystick.app/p/${PROFILE_SLUG}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/pw-founder-preview-owner.png" });

    // Banner must be visible
    await expect(page.locator("text=Preview mode — this is how your profile will look to others. Not published yet."))
      .toBeVisible({ timeout: 15000 });

    // "Back to profile settings" link must point to /app/profile
    const backLink = page.locator("a", { hasText: /back to profile settings/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/app/profile");

    // Profile content (company name heading) must be visible
    await expect(page.getByRole("heading", { name: "Playwright Test Co" })).toBeVisible({ timeout: 5000 });

    console.log("✓ Owner sees preview banner + full profile");
    await context.close();
  });

  test("2. Unauthenticated visitor sees 'Profile private' for unpublished profile", async ({ browser }) => {
    // No session injection — fresh context, no auth
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`https://hockystick.app/p/${PROFILE_SLUG}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/pw-founder-preview-anon.png" });

    // Must show private message
    await expect(page.locator("text=Profile private")).toBeVisible({ timeout: 15000 });

    // Must NOT show the company name heading (content is hidden)
    await expect(page.getByRole("heading", { name: "Playwright Test Co" })).not.toBeVisible();

    // Must NOT show the preview banner (only the owner sees that)
    await expect(page.locator("text=Preview mode")).not.toBeVisible();

    console.log("✓ Unauthenticated visitor sees 'Profile private'");
    await context.close();
  });

});
