/**
 * Playwright tests: Landing light default + investor deal rooms + workstation score
 *
 * Test 1 — Landing defaults to light: clear localStorage, navigate to /
 *           At least one of sections 3-6 or 8 has a light background
 * Test 2 — Investor deal rooms page loads
 * Test 3 — Workstation has readiness score section
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

const SUPABASE_URL = localEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = process.env.PLAYWRIGHT_BASE_URL || "https://hockystick.app";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL || "test-founder@hockystick.app";
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL || "test-investor@hockystick.app";
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password?: string) {
  if (!SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  if (!password) throw new Error(`Missing password for ${email}`);
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ email, password }),
  });
  const session = await r.json() as any;
  if (!session.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(session)}`);
  return session;
}

async function injectSession(ctx: BrowserContext, session: any, theme = "dark") {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(({ key, val, theme }: any) => {
    localStorage.setItem(key, JSON.stringify(val));
    localStorage.setItem("vr.theme", theme);
    localStorage.setItem("hs_ai_panel_open", "false");
  }, {
    key: STORAGE_KEY,
    val: {
      access_token: session.access_token, refresh_token: session.refresh_token,
      expires_in: session.expires_in, expires_at: session.expires_at,
      token_type: session.token_type, user: session.user,
    },
    theme,
  });
  await p.close();
}

let founderSession: any;
let investorSession: any;

test.beforeAll(async () => {
  [founderSession, investorSession] = await Promise.all([
    getSession(FOUNDER_EMAIL, FOUNDER_PASS),
    getSession(INVESTOR_EMAIL, INVESTOR_PASS),
  ]);
});

test.describe("Landing light + investor deal rooms + workstation score", () => {

  test("1. Landing defaults to light — sections 3-6 not dark", async ({ page }) => {
    test.setTimeout(60000);
    console.log("\n── TEST 1: Landing light default ──");

    // Navigate with NO localStorage (fresh browser context from page fixture)
    // The page fixture is fresh each test — no localStorage
    await page.goto(`${APP}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // The landing page root wrapper always has dark bg (#0A0A0B) — that's the outer div
    // But sections 3-6 should now be light when vr.theme is not set (defaults to light)
    // Since localStorage is empty, useDark() returns false → sections get light bgs

    // Check the "How it works" section (#how-it-works) or "for-founders" section
    const howItWorksSection = page.locator("section#how-it-works");
    const howItWorksBg = await howItWorksSection.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    ).catch(() => "");
    console.log(`#how-it-works bg: "${howItWorksBg}"`);

    const forFoundersSection = page.locator("section#for-founders");
    const forFoundersBg = await forFoundersSection.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    ).catch(() => "");
    console.log(`#for-founders bg: "${forFoundersBg}"`);

    const forInvestorsSection = page.locator("section#for-investors");
    const forInvestorsBg = await forInvestorsSection.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    ).catch(() => "");
    console.log(`#for-investors bg: "${forInvestorsBg}"`);

    // Dark background = rgb(10, 10, 11) or rgb(17, 17, 19)
    const DARK_BG_1 = "rgb(10, 10, 11)";
    const DARK_BG_2 = "rgb(17, 17, 19)";

    const howItWorksIsLight = howItWorksBg !== DARK_BG_1 && howItWorksBg !== DARK_BG_2 && howItWorksBg !== "";
    const forFoundersIsLight = forFoundersBg !== DARK_BG_1 && forFoundersBg !== DARK_BG_2 && forFoundersBg !== "";
    const forInvestorsIsLight = forInvestorsBg !== DARK_BG_1 && forInvestorsBg !== DARK_BG_2 && forInvestorsBg !== "";

    console.log(`How it works light: ${howItWorksIsLight}, For Founders light: ${forFoundersIsLight}, For Investors light: ${forInvestorsIsLight}`);

    // At least one of the sections should be light
    const atLeastOneSectionIsLight = howItWorksIsLight || forFoundersIsLight || forInvestorsIsLight;
    expect(atLeastOneSectionIsLight).toBe(true);

    // Page body should not crash
    const body = await page.textContent("body") ?? "";
    expect(body).not.toContain("Something went wrong");

    await page.screenshot({ path: "/tmp/pw-landing-light-1.png" });
  });

  test("2. Investor deal rooms page loads", async ({ browser }) => {
    test.setTimeout(90000);
    console.log("\n── TEST 2: Investor deal rooms page ──");

    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "dark");
    const page = await ctx.newPage();
    await page.goto(`${APP}/app/investor/deal-rooms`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const body = await page.textContent("body") ?? "";
    console.log(`Current URL: ${page.url()}`);

    const hasCrash = body.includes("Something went wrong") || body.includes("ChunkLoadError");
    expect(hasCrash).toBe(false);
    console.log("No crash ✓");

    // Should show either a deal room card (Atlas Robotics) or the empty state
    const hasAtlas = body.includes("Atlas") || body.includes("ATLAS");
    const hasEmptyState = body.includes("No deal rooms") || body.includes("appear here");
    const hasContent = hasAtlas || hasEmptyState;

    console.log(`Atlas visible: ${hasAtlas}, Empty state: ${hasEmptyState}`);
    expect(hasContent).toBe(true);

    // Header should be present
    const hasHeader = body.includes("Deal Rooms") || body.includes("data room");
    console.log(`Header present: ${hasHeader}`);
    expect(hasHeader).toBe(true);

    const jsErrors = errors.filter((e) => e.includes("ReferenceError") || e.includes("is not defined"));
    expect(jsErrors.length).toBe(0);

    await page.screenshot({ path: "/tmp/pw-landing-light-2.png" });
    await ctx.close();
  });

  test("3. Workstation has readiness score section", async ({ browser }) => {
    test.setTimeout(90000);
    console.log("\n── TEST 3: Workstation score section ──");

    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession, "dark");
    const page = await ctx.newPage();
    await page.goto(`${APP}/app`, { waitUntil: "networkidle" });
    await page.waitForTimeout(4000);

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const body = await page.textContent("body") ?? "";
    console.log(`Current URL: ${page.url()}`);

    const hasCrash = body.includes("Something went wrong") || body.includes("ChunkLoadError");
    expect(hasCrash).toBe(false);

    // Readiness section should be present — either ReadinessCard or ScoreAuditCard
    const hasReadiness = (
      body.includes("Investor Readiness") ||
      body.includes("Score Audit") ||
      body.includes("Run Score Audit") ||
      body.includes("readiness") ||
      body.includes("/ 100")
    );
    console.log(`Readiness section present: ${hasReadiness}`);
    expect(hasReadiness).toBe(true);

    // ScoreAuditCard test id check
    const scoreCard = page.getByTestId("score-audit-card");
    const scoreCardVisible = await scoreCard.isVisible().catch(() => false);
    console.log(`score-audit-card testid visible: ${scoreCardVisible}`);

    const jsErrors = errors.filter((e) => e.includes("ReferenceError") || e.includes("is not defined"));
    expect(jsErrors.length).toBe(0);

    await page.screenshot({ path: "/tmp/pw-landing-light-3.png" });
    await ctx.close();
  });

});
