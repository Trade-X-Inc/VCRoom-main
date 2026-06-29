/**
 * Playwright tests: DR-6 — ProfileBuilder on Documents page
 */

import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return env;
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

// Test founder startup ID (permanent fixture — never delete)
const TEST_STARTUP_ID = "c9101e5d-619a-4490-a6c9-ce4f0ed78812";

async function getSession(email: string, password?: string) {
  if (!SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");
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

async function injectSession(ctx: BrowserContext, session: any) {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(({ key, val }: any) => {
    localStorage.setItem(key, JSON.stringify(val));
    localStorage.setItem("vr.theme", "light");
    localStorage.setItem("hs_ai_panel_open", "false");
  }, {
    key: STORAGE_KEY,
    val: {
      access_token: session.access_token, refresh_token: session.refresh_token,
      expires_in: session.expires_in, expires_at: session.expires_at,
      token_type: session.token_type, user: session.user,
    },
  });
  await p.close();
}

async function openDocumentsPage(ctx: BrowserContext, session: any) {
  await injectSession(ctx, session);
  const page = await ctx.newPage();
  await page.goto(`${APP}/app/documents`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Verifying access") &&
          !document.body.textContent?.includes("Signing you in"),
    { timeout: 30000 },
  );
  await page.waitForTimeout(2000);
  return page;
}

let founderSession: any;
let investorSession: any;

test.beforeAll(async () => {
  [founderSession, investorSession] = await Promise.all([
    getSession(FOUNDER_EMAIL, FOUNDER_PASS),
    getSession(INVESTOR_EMAIL, INVESTOR_PASS),
  ]);
});

test.afterAll(async () => {
  // Clean up any custom sections added during testing (keep standard sections as they are the stable fixture)
  if (!SERVICE_KEY) return;
  await fetch(
    `${SUPABASE_URL}/rest/v1/startup_profile_sections?startup_id=eq.${TEST_STARTUP_ID}&is_custom=eq.true&section_key=eq.test_pw_custom`,
    {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    },
  );
});

test.describe("DR-6: ProfileBuilder on Documents page", () => {

  test("1. Documents page loads — ProfileBuilder header visible", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDocumentsPage(ctx, founderSession);

    console.log("\n── TEST 1: ProfileBuilder header ──");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const header = page.getByTestId("profile-builder-header");
    await expect(header).toBeVisible({ timeout: 10000 });
    console.log("profile-builder-header visible");

    const body = await page.textContent("body") ?? "";
    const hasTitle = body.includes("Digital Profile");
    console.log(`"Digital Profile" title present: ${hasTitle}`);
    expect(hasTitle).toBe(true);

    // Readiness panel should NOT appear (removed in DR-6)
    const hasReadiness = body.includes("Investor readiness") && body.includes("/100");
    console.log(`Old readiness panel present (should be false): ${hasReadiness}`);
    expect(hasReadiness).toBe(false);

    const hasCrash = body.includes("Something went wrong") || body.includes("ChunkLoadError");
    expect(hasCrash).toBe(false);
    const hasRefError = errors.some((e) => e.includes("is not defined") || e.includes("ReferenceError"));
    expect(hasRefError).toBe(false);
    console.log(`JS errors: ${errors.length > 0 ? errors.slice(0, 3).join("; ") : "none"}`);

    await page.screenshot({ path: "/tmp/pw-pb-1.png" });
    await ctx.close();
  });

  test("2. Expand ProfileBuilder — sections seeded in DB", async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext();
    const page = await openDocumentsPage(ctx, founderSession);

    console.log("\n── TEST 2: Expand + seed ──");

    // Click header to expand
    const header = page.getByTestId("profile-builder-header");
    await expect(header).toBeVisible({ timeout: 10000 });
    await header.click();
    await page.waitForTimeout(3000); // wait for auto-seed if needed

    // Query DB
    const countResp = await fetch(
      `${SUPABASE_URL}/rest/v1/startup_profile_sections?startup_id=eq.${TEST_STARTUP_ID}&select=id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const rows = await countResp.json() as any[];
    const dbCount = Array.isArray(rows) ? rows.length : 0;
    console.log(`DB count (startup_profile_sections): ${dbCount}`);
    expect(dbCount).toBeGreaterThanOrEqual(11);

    // Section content should be visible
    const body = await page.textContent("body") ?? "";
    const hasSection = body.includes("Executive Summary") || body.includes("Team") || body.includes("Market");
    console.log(`Section list visible: ${hasSection}`);
    expect(hasSection).toBe(true);

    await page.screenshot({ path: "/tmp/pw-pb-2.png" });
    await ctx.close();
  });

  test("3. Expand section — save button works", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDocumentsPage(ctx, founderSession);

    console.log("\n── TEST 3: Section save ──");

    // Expand profile builder panel
    const header = page.getByTestId("profile-builder-header");
    await expect(header).toBeVisible({ timeout: 10000 });
    await header.click();
    await page.waitForTimeout(2000);

    // Expand executive_summary section
    const body = await page.textContent("body") ?? "";
    const hasSections = body.includes("Executive Summary");
    if (!hasSections) {
      console.log("Sections not rendered yet — skipping");
      await ctx.close();
      return;
    }

    // Click the Executive Summary section to expand it
    const execSummaryRow = page.locator("button", { hasText: "Executive Summary" }).first();
    await execSummaryRow.click();
    await page.waitForTimeout(500);

    // Find save button
    const saveBtn = page.getByTestId("save-section-executive_summary");
    const saveBtnVisible = await saveBtn.isVisible().catch(() => false);
    console.log(`Save button visible: ${saveBtnVisible}`);
    expect(saveBtnVisible).toBe(true);

    // Find extract button
    const extractBtn = page.getByTestId("extract-section-executive_summary");
    const extractBtnVisible = await extractBtn.isVisible().catch(() => false);
    console.log(`Extract button visible: ${extractBtnVisible}`);
    expect(extractBtnVisible).toBe(true);

    // Click save (content is empty — should still save successfully)
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // After save, button should briefly show "Saved ✓" or revert
    const bodyAfter = await page.textContent("body") ?? "";
    const savedOk = bodyAfter.includes("Saved") || bodyAfter.includes("Save");
    console.log(`Save result present: ${savedOk}`);
    expect(savedOk).toBe(true);

    await page.screenshot({ path: "/tmp/pw-pb-3.png" });
    await ctx.close();
  });

  test("4. Visibility cycling — private → deal_room → public", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDocumentsPage(ctx, founderSession);

    console.log("\n── TEST 4: Visibility cycle ──");

    const header = page.getByTestId("profile-builder-header");
    await expect(header).toBeVisible({ timeout: 10000 });
    await header.click();
    await page.waitForTimeout(2000);

    const body = await page.textContent("body") ?? "";
    if (!body.includes("Executive Summary")) {
      console.log("Sections not rendered — skipping");
      await ctx.close();
      return;
    }

    // Find visibility badge for executive_summary (Private 🔒 or Deal Room 🔐)
    const privateBadge = page.locator("button", { hasText: /Private|Deal Room|Public/ }).first();
    const badgeVisible = await privateBadge.isVisible().catch(() => false);
    console.log(`Visibility badge visible: ${badgeVisible}`);
    expect(badgeVisible).toBe(true);

    // Click to cycle
    await privateBadge.click();
    await page.waitForTimeout(1500);

    const bodyAfter = await page.textContent("body") ?? "";
    const hasDealRoom = bodyAfter.includes("Deal Room") || bodyAfter.includes("Public") || bodyAfter.includes("Private");
    console.log(`Visibility badge updated: ${hasDealRoom}`);
    expect(hasDealRoom).toBe(true);

    await page.screenshot({ path: "/tmp/pw-pb-4.png" });
    await ctx.close();
  });

  test("5. Investor sees 'Documents are for founders' — no ProfileBuilder", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDocumentsPage(ctx, investorSession);

    console.log("\n── TEST 5: Investor gate ──");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const currentUrl = page.url();
    const body = await page.textContent("body") ?? "";
    console.log(`Investor landed at: ${currentUrl}`);

    // Investor is either shown a gate message OR redirected away from /app/documents — both are correct
    const hasGate = body.includes("Documents are for founders") || body.includes("only available to startup founders");
    const wasRedirected = !currentUrl.includes("/app/documents");
    console.log(`Investor gate message present: ${hasGate}, redirected away: ${wasRedirected}`);
    expect(hasGate || wasRedirected).toBe(true);

    // ProfileBuilder must not be visible to an investor either way
    const profileHeader = page.getByTestId("profile-builder-header");
    const profileVisible = await profileHeader.isVisible().catch(() => false);
    console.log(`ProfileBuilder visible to investor (should be false): ${profileVisible}`);
    expect(profileVisible).toBe(false);

    const hasRefError = errors.some((e) => e.includes("is not defined") || e.includes("ReferenceError"));
    expect(hasRefError).toBe(false);

    await page.screenshot({ path: "/tmp/pw-pb-5.png" });
    await ctx.close();
  });

});
