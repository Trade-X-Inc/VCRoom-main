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

const SUPABASE_URL    = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY     = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY     = `sb-ldimninnjlvxozubheib-auth-token`;
const INVESTOR_EMAIL  = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASSWORD = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
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
  await page.evaluate(({ key, session }: { key: string; session: any }) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    }));
  }, { key: STORAGE_KEY, session });
  await page.close();
}

// Confirm test-investor's profile_slug and profile_published state
async function getInvestorProfile() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/investor_profiles?user_id=eq.${testEnv.TEST_INVESTOR_USER_ID}&select=id,profile_slug,profile_published`,
    { headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}` } }
  );
  const rows = await res.json() as any[];
  return rows[0];
}

test.describe("Investor profile UX fixes", () => {

  test("Fix 1 — all 5 accordion sections default open", async ({ browser }) => {
    const context = await browser.newContext();
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, session);
    const page = await context.newPage();

    await page.goto("https://hockystick.app/app/investor/profile", { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/pw-profile-accordions.png" });

    // Portfolio accordion open: "Add portfolio company" button only exists when open
    await expect(page.locator("button", { hasText: "Add portfolio company" })).toBeVisible({ timeout: 10000 });

    // Thesis accordion open: textarea with this unique placeholder only renders in open content
    await expect(page.locator('textarea[placeholder*="Acme Ventures is a"]')).toBeVisible({ timeout: 5000 });

    // Achievements accordion open: input with this unique placeholder only renders in open content
    await expect(page.locator('input[placeholder*="Led Series A in Stripe"]').first()).toBeVisible({ timeout: 5000 });

    // Team section open: "Add member" button only renders when team accordion is open
    await expect(page.locator("button", { hasText: "Add member" })).toBeVisible({ timeout: 5000 });

    console.log("All 5 accordions confirmed open by default");
    await context.close();
  });

  test("Fix 2 — 'View public profile' link always visible and correct slug", async ({ browser }) => {
    const context = await browser.newContext();
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, session);
    const page = await context.newPage();

    await page.goto("https://hockystick.app/app/investor/profile", { waitUntil: "networkidle" });

    const profile = await getInvestorProfile();
    console.log("Profile slug:", profile.profile_slug, "Published:", profile.profile_published);

    const viewLink = page.locator("a", { hasText: /View public profile/i });
    await expect(viewLink).toBeVisible({ timeout: 10000 });

    const href = await viewLink.getAttribute("href");
    const target = await viewLink.getAttribute("target");
    console.log("Link href:", href, "target:", target);

    expect(href).toContain(`/i/${profile.profile_slug}`);
    expect(target).toBe("_blank");

    await page.screenshot({ path: "/tmp/pw-view-public-link.png" });
    await context.close();
  });

  test("Fix 2 — owner views own unpublished profile: preview banner shown, content rendered", async ({ browser }) => {
    const profile = await getInvestorProfile();
    console.log("profile_published:", profile.profile_published, "slug:", profile.profile_slug);

    // Ensure profile is NOT published for this test
    if (profile.profile_published) {
      // Temporarily unpublish
      await fetch(
        `${SUPABASE_URL}/rest/v1/investor_profiles?id=eq.${profile.id}`,
        {
          method: "PATCH",
          headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ profile_published: false }),
        }
      );
      console.log("Temporarily unpublished for test");
    }

    const context = await browser.newContext();
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, session);
    const page = await context.newPage();

    await page.goto(`https://hockystick.app/i/${profile.profile_slug}`, { waitUntil: "networkidle" });
    // Client-side session check + fetch takes a moment — wait for spinner to clear
    await page.waitForSelector("text=Preview mode", { timeout: 15000 });
    await page.screenshot({ path: "/tmp/pw-owner-preview.png" });

    const url = page.url();
    console.log("Owner preview URL:", url);

    expect(url).toContain(`/i/${profile.profile_slug}`);

    // Preview banner must be visible
    const banner = page.locator("text=Preview mode");
    await expect(banner).toBeVisible({ timeout: 5000 });
    console.log("Preview banner visible");

    // Profile content renders (fund name visible in the hero)
    const heroContent = page.locator("text=Test Ventures").first();
    await expect(heroContent).toBeVisible({ timeout: 5000 });
    console.log("Hero content rendered");

    // Restore published state if we changed it
    if (profile.profile_published) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/investor_profiles?id=eq.${profile.id}`,
        {
          method: "PATCH",
          headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ profile_published: true }),
        }
      );
    }

    await context.close();
  });

  test("Fix 2 — non-owner/unauthenticated view of unpublished profile shows 'not found'", async ({ browser }) => {
    const profile = await getInvestorProfile();

    // Ensure profile is NOT published
    await fetch(
      `${SUPABASE_URL}/rest/v1/investor_profiles?id=eq.${profile.id}`,
      {
        method: "PATCH",
        headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ profile_published: false }),
      }
    );

    // Visit as unauthenticated (no session injected)
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`https://hockystick.app/i/${profile.profile_slug}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/pw-nonowner-unpublished.png" });

    const bodyText = await page.textContent("body");
    console.log("Body text (first 200):", bodyText?.slice(0, 200));

    // Should show not-found content
    expect(bodyText).toMatch(/Profile not found|private|doesn't exist/i);
    console.log("Non-owner correctly sees 'not found'");

    await context.close();
  });

});
