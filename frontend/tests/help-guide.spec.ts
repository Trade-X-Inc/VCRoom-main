/**
 * Playwright tests: UI-4 — In-app help guide + settings expansion
 *
 * 1. Founder settings — "How to use" tab visible and opens help guide
 * 2. Founder settings — "About" tab opens about section with support email
 * 3. Founder help guide — all 6 accordion sections present in body
 * 4. Investor settings — "How to use" and "About" tabs visible
 * 5. Investor help guide — all 5 accordion sections present in body
 * 6. About section — version info + legal links present
 */

import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(p: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (!fs.existsSync(p)) return e;
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    e[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return e;
}

const testEnv = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = "https://hockystick.app";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Auth failed: ${await r.text()}`);
  return r.json();
}

async function injectSession(ctx: BrowserContext, session: any) {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(
    ({ key, s }: any) => {
      localStorage.setItem(key, JSON.stringify({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        expires_in: s.expires_in,
        expires_at: s.expires_at,
        token_type: s.token_type,
        user: s.user,
      }));
      localStorage.setItem("hs_ai_panel_open", "false");
    },
    { key: STORAGE_KEY, s: session },
  );
  await p.close();
}

async function waitForLoad(page: any) {
  await page.waitForFunction(
    () =>
      !document.body.textContent?.includes("Verifying access") &&
      !document.body.textContent?.includes("Signing you in") &&
      !document.body.textContent?.includes("Loading…"),
    { timeout: 25000 },
  );
}

let founderSession: any;
let investorSession: any;

test.beforeAll(async () => {
  [founderSession, investorSession] = await Promise.all([
    getSession(FOUNDER_EMAIL, FOUNDER_PASS),
    getSession(INVESTOR_EMAIL, INVESTOR_PASS),
  ]);
});

test.describe("UI-4: Help guide + settings expansion", () => {

  // ── Test 1 ─────────────────────────────────────────────────────────────────
  test("1. Founder settings — 'How to use' tab visible and opens help guide", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/settings`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 1 RESULT ──");

    // "How to use" tab should be visible in the sidebar
    const helpTab = page.locator('[data-testid="settings-tab-help"]');
    await expect(helpTab).toBeVisible({ timeout: 10000 });
    console.log("✓ 'How to use' tab visible");

    // Click it
    await helpTab.click();
    await page.waitForTimeout(500);

    // Help guide heading should appear
    const body = await page.textContent("body") ?? "";
    const hasHelpHeading = body.includes("How to use Hockystick");
    console.log(`Has 'How to use Hockystick' heading: ${hasHelpHeading}`);
    expect(hasHelpHeading).toBe(true);
    console.log("✓ Founder help guide loaded");

    // Getting started section should be defaultOpen
    const hasGettingStarted = body.includes("Getting started");
    console.log(`Has 'Getting started' section: ${hasGettingStarted}`);
    expect(hasGettingStarted).toBe(true);

    await page.screenshot({ path: "/tmp/pw-help-1.png" });
    await ctx.close();
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  test("2. Founder settings — 'About' tab opens about section with support email", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/settings`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 2 RESULT ──");

    // Click "About" tab
    const aboutTab = page.locator('[data-testid="settings-tab-about"]');
    await expect(aboutTab).toBeVisible({ timeout: 10000 });
    await aboutTab.click();
    await page.waitForTimeout(500);

    const body = await page.textContent("body") ?? "";

    // About section heading
    const hasAbout = body.includes("About Hockystick");
    console.log(`Has 'About Hockystick' heading: ${hasAbout}`);
    expect(hasAbout).toBe(true);

    // Version info
    const hasVersion = body.includes("v2.0") || body.includes("Beta");
    console.log(`Has version info: ${hasVersion}`);
    expect(hasVersion).toBe(true);

    // Support email link
    const supportLink = page.locator('[data-testid="support-email-link"]');
    await expect(supportLink).toBeVisible({ timeout: 5000 });
    console.log("✓ Support email link visible");

    // Legal links
    const hasPrivacy = body.includes("Privacy Policy");
    const hasTerms = body.includes("Terms of Service");
    console.log(`Has 'Privacy Policy': ${hasPrivacy}, 'Terms of Service': ${hasTerms}`);
    expect(hasPrivacy).toBe(true);
    expect(hasTerms).toBe(true);

    await page.screenshot({ path: "/tmp/pw-help-2.png" });
    await ctx.close();
  });

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  test("3. Founder help guide — all 6 accordion sections present in body", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/settings`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 3 RESULT ──");

    // Open help tab
    await page.locator('[data-testid="settings-tab-help"]').click();
    await page.waitForTimeout(500);

    const body = await page.textContent("body") ?? "";

    const sections = [
      "Getting started",
      "Deal rooms",
      "The Workstation",
      "Connections",
      "Team workspace",
      "Common questions",
    ];

    for (const section of sections) {
      const found = body.includes(section);
      console.log(`Has section '${section}': ${found}`);
      expect(found, `Section '${section}' must be present`).toBe(true);
    }
    console.log("✓ All 6 founder help accordion sections present");

    await page.screenshot({ path: "/tmp/pw-help-3.png" });
    await ctx.close();
  });

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  test("4. Investor settings — 'How to use' and 'About' tabs visible in sidebar", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/settings`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 4 RESULT ──");

    // "How to use" tab
    const helpTab = page.locator('[data-testid="settings-tab-help"]');
    await expect(helpTab).toBeVisible({ timeout: 10000 });
    console.log("✓ 'How to use' tab visible (investor settings)");

    // "About" tab
    const aboutTab = page.locator('[data-testid="settings-tab-about"]');
    await expect(aboutTab).toBeVisible({ timeout: 5000 });
    console.log("✓ 'About' tab visible (investor settings)");

    // Notifications tab (first default)
    const notifTab = page.locator('[data-testid="settings-tab-notifications"]');
    await expect(notifTab).toBeVisible({ timeout: 5000 });
    console.log("✓ 'Notifications' tab visible (investor settings)");

    // Security tab
    const secTab = page.locator('[data-testid="settings-tab-security"]');
    await expect(secTab).toBeVisible({ timeout: 5000 });
    console.log("✓ 'Security' tab visible (investor settings)");

    await page.screenshot({ path: "/tmp/pw-help-4.png" });
    await ctx.close();
  });

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  test("5. Investor help guide — all 5 accordion sections present in body", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/settings`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 5 RESULT ──");

    // Open help tab
    await page.locator('[data-testid="settings-tab-help"]').click();
    await page.waitForTimeout(500);

    const body = await page.textContent("body") ?? "";

    const sections = [
      "Getting started",
      "Deal Intake",
      "Due Diligence",
      "Decisions and Pipeline",
      "Common questions",
    ];

    for (const section of sections) {
      const found = body.includes(section);
      console.log(`Has section '${section}': ${found}`);
      expect(found, `Section '${section}' must be present`).toBe(true);
    }
    console.log("✓ All 5 investor help accordion sections present");

    await page.screenshot({ path: "/tmp/pw-help-5.png" });
    await ctx.close();
  });

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  test("6. About section — version, Venture Tech LLC, legal links — accessible from investor settings", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/settings`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 6 RESULT ──");

    // Open About tab
    await page.locator('[data-testid="settings-tab-about"]').click();
    await page.waitForTimeout(500);

    const body = await page.textContent("body") ?? "";

    // Venture Tech LLC
    const hasVentTech = body.includes("Venture Tech LLC");
    console.log(`Has 'Venture Tech LLC': ${hasVentTech}`);
    expect(hasVentTech).toBe(true);

    // DIFC FinTech Hive
    const hasDIFC = body.includes("DIFC");
    console.log(`Has 'DIFC': ${hasDIFC}`);
    expect(hasDIFC).toBe(true);

    // Privacy + Terms + Cookies
    const hasPrivacy = body.includes("Privacy Policy");
    const hasTerms = body.includes("Terms of Service");
    const hasCookies = body.includes("Cookie Policy");
    console.log(`Legal links — Privacy: ${hasPrivacy}, Terms: ${hasTerms}, Cookies: ${hasCookies}`);
    expect(hasPrivacy).toBe(true);
    expect(hasTerms).toBe(true);
    expect(hasCookies).toBe(true);
    console.log("✓ About section complete — all info present");

    await page.screenshot({ path: "/tmp/pw-help-6.png" });
    await ctx.close();
  });
});
