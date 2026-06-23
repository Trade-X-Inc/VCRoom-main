import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load credentials ──────────────────────────────────────────────────────────

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

const SUPABASE_URL      = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY       = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY          = localEnv.VITE_SUPABASE_ANON_KEY;
const STORAGE_KEY       = `sb-ldimninnjlvxozubheib-auth-token`;

const FOUNDER_EMAIL     = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASSWORD  = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL    = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASSWORD = testEnv.TEST_INVESTOR_PASSWORD;
const INVESTOR_PROFILE_ID = testEnv.TEST_INVESTOR_PROFILE_ID;

// ── Auth helper — bypasses captcha via service key, injects session ───────────

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
  // Navigate to the app first so cookies/storage are scoped to the right origin
  const page = await context.newPage();
  await page.goto("https://hockystick.app/", { waitUntil: "domcontentloaded" });

  // Inject session into localStorage in the Supabase format
  await page.evaluate(({ key, session }: { key: string; session: any }) => {
    const value = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    });
    localStorage.setItem(key, value);
  }, { key: STORAGE_KEY, session });

  await page.close();
}

async function signInAs(context: BrowserContext, email: string, password: string): Promise<Page> {
  const session = await getSession(email, password);
  await injectSession(context, session);
  const page = await context.newPage();
  return page;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Auth smoke tests", () => {
  test("test-founder logs in and lands on /app", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signInAs(context, FOUNDER_EMAIL, FOUNDER_PASSWORD);

    await page.goto("https://hockystick.app/app", { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/playwright-founder-landing.png" });

    const url = page.url();
    console.log("Founder landed at:", url);
    expect(url).toMatch(/\/app/);

    // Confirm we're not on the sign-in page
    expect(url).not.toMatch(/sign-in/);
    await context.close();
  });

  test("test-investor logs in and lands on /app/investor", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signInAs(context, INVESTOR_EMAIL, INVESTOR_PASSWORD);

    await page.goto("https://hockystick.app/app/investor", { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/playwright-investor-landing.png" });

    const url = page.url();
    console.log("Investor landed at:", url);
    expect(url).toMatch(/\/app\/investor/);
    expect(url).not.toMatch(/sign-in/);
    await context.close();
  });
});

test.describe("Portfolio entry — end-to-end", () => {
  test("add portfolio company via UI form — no page reload, row in DB", async ({ browser }) => {
    // ── Clean up any previous test runs first ─────────────────────────────────
    const cleanRes = await fetch(
      `${SUPABASE_URL}/rest/v1/investor_portfolio_entries?investor_profile_id=eq.${INVESTOR_PROFILE_ID}&company_name=eq.Playwright%20Auto%20Co`,
      {
        method: "DELETE",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Prefer": "return=minimal",
        },
      }
    );
    console.log("Pre-test cleanup status:", cleanRes.status);

    // ── Sign in as test-investor ──────────────────────────────────────────────
    const context = await browser.newContext();
    const page = await signInAs(context, INVESTOR_EMAIL, INVESTOR_PASSWORD);

    // ── Navigate to profile page ──────────────────────────────────────────────
    await page.goto("https://hockystick.app/app/investor/profile", { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/playwright-profile-loaded.png" });
    console.log("Profile page URL:", page.url());

    // Confirm we're on the profile page (not redirected to sign-in)
    expect(page.url()).toMatch(/app\/investor\/profile/);

    // ── Open Portfolio accordion ──────────────────────────────────────────────
    const portfolioAccordion = page.locator("button", { hasText: "Portfolio showcase" });
    await expect(portfolioAccordion).toBeVisible({ timeout: 10000 });
    await portfolioAccordion.click();
    await page.waitForTimeout(500); // accordion animation

    // ── Click "Add portfolio company" ─────────────────────────────────────────
    const addCompanyBtn = page.locator("button", { hasText: "Add portfolio company" });
    await expect(addCompanyBtn).toBeVisible({ timeout: 8000 });
    await addCompanyBtn.click();
    await page.waitForTimeout(300);

    // ── Fill the form ─────────────────────────────────────────────────────────
    const nameInput = page.locator('input[placeholder="Stripe"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill("Playwright Auto Co");

    const descInput = page.locator('textarea').last();
    await descInput.fill("Automated by Playwright. Safe to delete.");

    await page.screenshot({ path: "/tmp/playwright-form-filled.png" });

    // ── Record URL before submit ──────────────────────────────────────────────
    const urlBefore = page.url();

    // ── Click Add ────────────────────────────────────────────────────────────
    // The button text is "Add" when not editing
    const submitBtn = page.locator('button:has-text("Add")').last();
    await submitBtn.click();

    // Wait for async to settle
    await page.waitForTimeout(4000);

    const urlAfter = page.url();
    console.log("URL before:", urlBefore);
    console.log("URL after: ", urlAfter);

    // ── Assert: no navigation ─────────────────────────────────────────────────
    expect(urlAfter).toBe(urlBefore);

    await page.screenshot({ path: "/tmp/playwright-after-submit.png" });

    // ── Assert: card appears in UI ────────────────────────────────────────────
    const entryCard = page.locator("text=Playwright Auto Co").first();
    await expect(entryCard).toBeVisible({ timeout: 8000 });
    console.log("Entry card visible in UI");

    // ── Assert: row exists in DB (via service key) ────────────────────────────
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/investor_portfolio_entries?investor_profile_id=eq.${INVESTOR_PROFILE_ID}&company_name=eq.Playwright%20Auto%20Co&select=*`,
      {
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
      }
    );
    const rows = await dbRes.json() as any[];
    console.log("DB row count:", rows.length);
    console.log("DB row:", JSON.stringify(rows[0]));

    expect(rows.length).toBe(1);
    expect(rows[0].company_name).toBe("Playwright Auto Co");
    expect(rows[0].investor_profile_id).toBe(INVESTOR_PROFILE_ID);

    // ── Clean up after test ───────────────────────────────────────────────────
    await fetch(
      `${SUPABASE_URL}/rest/v1/investor_portfolio_entries?id=eq.${rows[0].id}`,
      {
        method: "DELETE",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Prefer": "return=minimal",
        },
      }
    );
    console.log("Test row cleaned up");

    await context.close();
  });
});
