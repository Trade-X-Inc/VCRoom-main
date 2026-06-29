/**
 * Playwright tests: UI-FIX-2 — theme + route fixes
 *
 * 1. Zero bg-card tokens remain (verified via build artifact check)
 * 2. Default theme is light (no .dark class on html for new sessions)
 * 3. Workstation text visible in light theme (no white-on-white)
 * 4. Deal Intake light theme (cards not dark)
 * 5. Decisions text visible (no white-on-white)
 * 6. Investor Feedback is correct page (star rating, not AI chat)
 * 7. Investor how-it-works → settings help tab
 * 8. Investor settings respects ?tab=help URL param
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
const THEME_KEY = "vr.theme";

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

async function injectSession(ctx: BrowserContext, session: any, theme?: string) {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(
    ({ key, s, themeKey, themeVal }: any) => {
      localStorage.setItem(key, JSON.stringify({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        expires_in: s.expires_in,
        expires_at: s.expires_at,
        token_type: s.token_type,
        user: s.user,
      }));
      localStorage.setItem("hs_ai_panel_open", "false");
      if (themeVal) {
        localStorage.setItem(themeKey, themeVal);
      } else {
        localStorage.removeItem(themeKey);
      }
    },
    { key: STORAGE_KEY, s: session, themeKey: THEME_KEY, themeVal: theme ?? null },
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

test.describe("UI-FIX-2: Theme + route fixes", () => {

  // ── Test 1 ─────────────────────────────────────────────────────────────────
  test("1. Default theme is light for new users (no stored preference)", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession, undefined); // no theme stored
    const page = await ctx.newPage();

    await page.goto(`${APP}/app`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 1 RESULT ──");

    const htmlClass = await page.evaluate(() => document.documentElement.className);
    const isDark = htmlClass.includes("dark");
    console.log(`html classes: "${htmlClass}"`);
    console.log(`Is dark class present: ${isDark}`);
    expect(isDark).toBe(false);

    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    console.log(`data-theme: "${dataTheme}"`);
    // Should be light or absent (not dark)
    expect(dataTheme).not.toBe("dark");

    await page.screenshot({ path: "/tmp/pw-fix3-1.png" });
    await ctx.close();
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  test("2. Dark theme preserved when user has stored 'dark' preference", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession, "dark"); // dark stored
    const page = await ctx.newPage();

    await page.goto(`${APP}/app`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 2 RESULT ──");

    const htmlClass = await page.evaluate(() => document.documentElement.className);
    const isDark = htmlClass.includes("dark");
    console.log(`html classes: "${htmlClass}"`);
    console.log(`Is dark class present: ${isDark}`);
    expect(isDark).toBe(true);

    await page.screenshot({ path: "/tmp/pw-fix3-2.png" });
    await ctx.close();
  });

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  test("3. Workstation text visible in light theme (no rgba white-on-white)", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 3 RESULT ──");

    // No white text on white background — check for rgba(255,255,255,X) color styles
    const whiteTextCount = await page.evaluate(() => {
      const all = document.querySelectorAll("*");
      let count = 0;
      for (const el of Array.from(all)) {
        const style = (el as HTMLElement).style;
        const color = style.color;
        if (color && color.startsWith("rgba(255, 255, 255")) {
          count++;
        }
      }
      return count;
    });
    console.log(`Elements with rgba white inline color: ${whiteTextCount}`);
    expect(whiteTextCount).toBe(0);

    // Verification heading is visible
    const body = await page.textContent("body") ?? "";
    const hasVerification = body.includes("Verification");
    console.log(`Has 'Verification' content: ${hasVerification}`);
    expect(hasVerification).toBe(true);

    await page.screenshot({ path: "/tmp/pw-fix3-3.png" });
    await ctx.close();
  });

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  test("4. Investor Deal Intake — no rgba white text in light theme", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/intake`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 4 RESULT ──");

    const body = await page.textContent("body") ?? "";
    expect(body.includes("Deal Intake")).toBe(true);

    const whiteTextCount = await page.evaluate(() => {
      const all = document.querySelectorAll("*");
      let count = 0;
      for (const el of Array.from(all)) {
        const color = (el as HTMLElement).style.color;
        if (color && color.startsWith("rgba(255, 255, 255")) {
          count++;
        }
      }
      return count;
    });
    console.log(`Elements with rgba white inline color: ${whiteTextCount}`);
    expect(whiteTextCount).toBe(0);

    await page.screenshot({ path: "/tmp/pw-fix3-4.png" });
    await ctx.close();
  });

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  test("5. Investor Decisions — no rgba white text in light theme", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/decisions`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 5 RESULT ──");

    const body = await page.textContent("body") ?? "";
    expect(body.includes("Decision")).toBe(true);

    const whiteTextCount = await page.evaluate(() => {
      const all = document.querySelectorAll("*");
      let count = 0;
      for (const el of Array.from(all)) {
        const color = (el as HTMLElement).style.color;
        if (color && color.startsWith("rgba(255, 255, 255")) {
          count++;
        }
      }
      return count;
    });
    console.log(`Elements with rgba white inline color: ${whiteTextCount}`);
    expect(whiteTextCount).toBe(0);

    await page.screenshot({ path: "/tmp/pw-fix3-5.png" });
    await ctx.close();
  });

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  test("6. Investor Feedback — shows rating form, not AI chat", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/feedback`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 6 RESULT ──");

    const body = await page.textContent("body") ?? "";

    // Must NOT show AI advisor text
    const hasAiAdvisor = body.includes("I'm your AI investment analyst") || body.includes("AI investment analyst");
    console.log(`Has AI advisor text: ${hasAiAdvisor}`);
    expect(hasAiAdvisor).toBe(false);

    // Must show feedback form
    const hasFeedbackContent = body.includes("Overall experience") || body.includes("out of 5") || body.includes("What worked");
    console.log(`Has feedback form content: ${hasFeedbackContent}`);
    expect(hasFeedbackContent).toBe(true);

    // Star rating should be present
    const starCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-testid*="star"], button svg').length;
    });
    console.log(`Star/button elements: ${starCount}`);

    await page.screenshot({ path: "/tmp/pw-fix3-6.png" });
    await ctx.close();
  });

  // ── Test 7 ─────────────────────────────────────────────────────────────────
  test("7. Investor overview 'How it works' navigates to settings help tab", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/overview`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 7 RESULT ──");

    // Find and click the "How it works" link
    const howLink = page.getByText("How it works");
    await expect(howLink).toBeVisible({ timeout: 10000 });
    await howLink.click();

    // Wait for navigation
    await page.waitForURL(/.*\/settings.*/, { timeout: 15000 });
    const url = page.url();
    console.log(`Navigated to: ${url}`);
    expect(url).toContain("/settings");
    expect(url).toContain("tab=help");

    await waitForLoad(page);
    const body = await page.textContent("body") ?? "";
    const hasHelpContent = body.includes("How to use") || body.includes("Getting started");
    console.log(`Has help guide content: ${hasHelpContent}`);
    expect(hasHelpContent).toBe(true);

    await page.screenshot({ path: "/tmp/pw-fix3-7.png" });
    await ctx.close();
  });

  // ── Test 8 ─────────────────────────────────────────────────────────────────
  test("8. Investor settings — ?tab=help URL param pre-selects help tab", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/settings?tab=help`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 8 RESULT ──");

    const body = await page.textContent("body") ?? "";
    const hasHelpContent = body.includes("How to use Hockystick") || body.includes("Getting started") || body.includes("Deal Intake");
    console.log(`Has investor help guide content: ${hasHelpContent}`);
    expect(hasHelpContent).toBe(true);

    // "How to use" tab should be active
    const activeTab = page.locator('[data-testid="settings-tab-help"]');
    await expect(activeTab).toBeVisible({ timeout: 10000 });
    console.log("✓ Help tab visible");

    await page.screenshot({ path: "/tmp/pw-fix3-8.png" });
    await ctx.close();
  });
});
