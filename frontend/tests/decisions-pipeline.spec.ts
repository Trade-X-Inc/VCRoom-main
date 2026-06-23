/**
 * Playwright tests: Decision Board (/app/investor/decisions)
 *
 * Uses test-investor account (seeded with 5 PW-prefixed watchlist entries).
 * Fixture data:
 *   PW Alpha Corp  — Reviewing,  stage_entered_at = now() - 20d  (STALE)
 *   PW Beta Ltd    — Diligence,  stage_entered_at = now() - 5d
 *   PW Gamma Inc   — Invested,   stage_entered_at = now() - 30d
 *   PW Delta Co    — Decision,   stage_entered_at = now() - 3d
 *   PW Epsilon Sys — Sourcing,   stage_entered_at = now() - 2d
 *
 * Tests:
 *   1. Page loads without crashing — kanban renders
 *   2. All 3 view modes accessible (kanban / list / grid)
 *   3. Stage filter to "Invested" shows only Invested companies
 *   4. Advance one entry one stage → DB updated, stage_entered_at refreshed
 *   5. Stale detection: PW Alpha Corp (20d in Reviewing) shows stale indicator
 *   6. Pass form writes pass_reason_category to watchlist row
 */

import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return env;
}

const testEnv  = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL   = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY    = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY    = "sb-ldimninnjlvxozubheib-auth-token";
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS  = testEnv.TEST_INVESTOR_PASSWORD;
const INVESTOR_ID    = testEnv.TEST_INVESTOR_USER_ID;

const PAGE_URL = "https://hockystick.app/app/investor/decisions";

// Known fixture IDs
const ALPHA_ID   = "fbcbbab3-62e4-45b2-a5ab-84f182bb1bda"; // Reviewing (stale)
const DELTA_ID   = "5fc16a00-ab6f-4128-b762-cba3c9f75cb5"; // Decision
const EPSILON_ID = "9415e468-e119-431d-a20f-de2f652bb8f0"; // Sourcing

// ── Helpers ───────────────────────────────────────────────────────────────────

async function serviceGet(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return r.json() as Promise<any[]>;
}

async function servicePatch(path: string, body: Record<string, any>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

async function getSession(email: string, password: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json() as any;
  if (!d.access_token) throw new Error(`Auth failed: ${JSON.stringify(d)}`);
  return d;
}

async function injectSession(ctx: BrowserContext, session: any) {
  const p = await ctx.newPage();
  await p.goto("https://hockystick.app/", { waitUntil: "domcontentloaded" });
  await p.evaluate(({ key, s }: any) => localStorage.setItem(key, JSON.stringify({
    access_token: s.access_token, refresh_token: s.refresh_token,
    expires_in: s.expires_in, expires_at: s.expires_at,
    token_type: s.token_type, user: s.user,
  })), { key: STORAGE_KEY, s: session });
  await p.close();
}

// Reset Alpha to Reviewing with stale stage_entered_at before each relevant test
async function resetAlpha() {
  await servicePatch(`investor_watchlist?id=eq.${ALPHA_ID}`, {
    status: "Reviewing",
    stage_entered_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    pass_reason_category: null,
    pass_reason_detail: null,
  });
}

async function resetEpsilon() {
  await servicePatch(`investor_watchlist?id=eq.${EPSILON_ID}`, {
    status: "Sourcing",
    stage_entered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

async function resetDelta() {
  await servicePatch(`investor_watchlist?id=eq.${DELTA_ID}`, {
    status: "Decision",
    stage_entered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    pass_reason_category: null,
    pass_reason_detail: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Decision Board", () => {

  test("1. Page loads, kanban renders with real data", async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
    const page = await ctx.newPage();

    await page.goto(PAGE_URL, { waitUntil: "networkidle" });
    // Wait for app shell to hydrate past auth loading state
    await page.waitForFunction(() => !document.body.textContent?.includes("Loading…"), { timeout: 20000 });
    await page.screenshot({ path: "/tmp/pw-decisions-1-load.png" });

    // Page title
    await expect(page.locator("text=Decision Board")).toBeVisible({ timeout: 15000 });

    // Kanban view is default — at least one company card visible
    await expect(page.locator("[data-testid^=company-card]").first()).toBeVisible({ timeout: 10000 });

    // Known fixture companies visible
    await expect(page.locator("text=PW Alpha Corp").first()).toBeVisible();
    await expect(page.locator("text=PW Beta Ltd").first()).toBeVisible();
    await expect(page.locator("text=PW Gamma Inc").first()).toBeVisible();

    console.log("✓ Page loads, kanban renders with real data");
    await ctx.close();
  });

  test("2. All 3 view modes accessible (kanban / list / grid)", async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
    const page = await ctx.newPage();

    await page.goto(PAGE_URL, { waitUntil: "networkidle" });
    await page.locator("text=Decision Board").waitFor({ timeout: 15000 });

    // Kanban (default)
    await expect(page.locator("[data-testid=view-kanban]")).toBeVisible();
    await expect(page.locator("[data-testid^=company-card]").first()).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: "/tmp/pw-decisions-2-kanban.png" });

    // Switch to List
    await page.locator("[data-testid=view-list]").click();
    await expect(page.locator("[data-testid=list-view-table]")).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: "/tmp/pw-decisions-2-list.png" });

    // Switch to Grid
    await page.locator("[data-testid=view-grid]").click();
    await expect(page.locator("[data-testid=grid-view]")).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "/tmp/pw-decisions-2-grid.png" });

    console.log("✓ All 3 view modes render");
    await ctx.close();
  });

  test("3. Stage filter to Invested shows only Invested companies", async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
    const page = await ctx.newPage();

    await page.goto(PAGE_URL, { waitUntil: "networkidle" });
    await page.locator("text=Decision Board").waitFor({ timeout: 15000 });
    await page.locator("[data-testid^=company-card]").first().waitFor({ timeout: 10000 });

    // Click Invested filter pill
    await page.locator("[data-testid=filter-stage-invested]").click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "/tmp/pw-decisions-3-filter.png" });

    // PW Gamma Inc (Invested) must be visible
    await expect(page.locator("text=PW Gamma Inc").first()).toBeVisible({ timeout: 5000 });

    // PW Alpha Corp (Reviewing) must NOT be visible
    await expect(page.locator("text=PW Alpha Corp").first()).not.toBeVisible();

    // PW Beta Ltd (Diligence) must NOT be visible
    await expect(page.locator("text=PW Beta Ltd").first()).not.toBeVisible();

    console.log("✓ Stage filter to Invested works correctly");
    await ctx.close();
  });

  test("4. Advance stage → DB status and stage_entered_at updated", async ({ browser }) => {
    await resetEpsilon();
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
    const page = await ctx.newPage();

    await page.goto(PAGE_URL, { waitUntil: "networkidle" });
    await page.locator("text=Decision Board").waitFor({ timeout: 15000 });
    await page.locator("[data-testid^=company-card]").first().waitFor({ timeout: 10000 });

    // Find PW Epsilon Sys card and click its advance button (Sourcing → Reviewing)
    const epsilonCard = page.locator(`[data-testid=company-card-${EPSILON_ID}]`);
    await epsilonCard.scrollIntoViewIfNeeded();
    const advBtn = epsilonCard.locator("button", { hasText: /reviewing|→/i });
    await advBtn.waitFor({ state: "attached", timeout: 8000 });

    // Record time before click
    const beforeMs = Date.now();
    await advBtn.click({ force: true });

    // Confirm modal appears — click confirm
    await page.locator("button", { hasText: /Move to Reviewing/i }).waitFor({ timeout: 8000 });
    await page.locator("button", { hasText: /Move to Reviewing/i }).click();

    // Wait for toast
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "/tmp/pw-decisions-4-advance.png" });

    // DB assertion
    const rows = await serviceGet(`investor_watchlist?id=eq.${EPSILON_ID}&select=status,stage_entered_at`);
    console.log("DB after advance:", JSON.stringify(rows[0]));
    expect(rows[0].status).toBe("Reviewing");
    expect(new Date(rows[0].stage_entered_at).getTime()).toBeGreaterThan(beforeMs - 5000);

    // Activity log — service key bypasses RLS
    const logs = await serviceGet(`activity_log?actor_user_id=eq.${INVESTOR_ID}&action_type=eq.pipeline_status_changed&target_id=eq.${EPSILON_ID}&order=created_at.desc&limit=1&select=detail,target_id`);
    console.log("Activity log:", JSON.stringify(logs[0]));
    expect(logs[0]?.detail).toMatch(/Sourcing.*Reviewing/);

    console.log("✓ Advance: status=Reviewing, stage_entered_at refreshed, activity logged");
    await ctx.close();
  });

  test("5. Stale detection: PW Alpha Corp (20d in Reviewing) shows stale indicator", async ({ browser }) => {
    await resetAlpha();
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
    const page = await ctx.newPage();

    await page.goto(PAGE_URL, { waitUntil: "networkidle" });
    await page.locator("text=Decision Board").waitFor({ timeout: 15000 });
    await page.locator("[data-testid^=company-card]").first().waitFor({ timeout: 10000 });

    // Alpha card should exist
    const alphaCard = page.locator(`[data-testid=company-card-${ALPHA_ID}]`);
    await expect(alphaCard).toBeVisible({ timeout: 8000 });

    // Stale indicator text inside the card
    await expect(alphaCard.locator("text=/Stale/")).toBeVisible({ timeout: 5000 });

    // Header shows stale count
    await expect(page.locator("text=/stale/i").first()).toBeVisible();

    // Stale-only filter shows Alpha
    await page.locator("[data-testid=filter-stale]").click();
    await page.waitForTimeout(300);
    await expect(alphaCard).toBeVisible();
    await expect(page.locator("text=PW Beta Ltd").first()).not.toBeVisible(); // 5d — not stale

    await page.screenshot({ path: "/tmp/pw-decisions-5-stale.png" });
    console.log("✓ Stale detection: PW Alpha Corp flagged after 20d, stale filter works");
    await ctx.close();
  });

  test("6. Pass form writes pass_reason_category to watchlist row", async ({ browser }) => {
    await resetDelta();
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
    const page = await ctx.newPage();

    await page.goto(PAGE_URL, { waitUntil: "networkidle" });
    await page.locator("text=Decision Board").waitFor({ timeout: 15000 });
    await page.locator("[data-testid^=company-card]").first().waitFor({ timeout: 10000 });

    // Find PW Delta Co (Decision stage) — click Pass
    const deltaCard = page.locator(`[data-testid=company-card-${DELTA_ID}]`);
    await deltaCard.scrollIntoViewIfNeeded();
    const passBtn = deltaCard.locator("button", { hasText: /^Pass$/i });
    await passBtn.waitFor({ state: "visible", timeout: 8000 });
    await passBtn.click();

    // Pass modal opens
    await expect(page.locator("text=/Pass — PW Delta/i")).toBeVisible({ timeout: 5000 });

    // Select "Valuation" as reason
    await page.locator("[data-testid=pass-cat-valuation]").click();
    await page.waitForTimeout(200);

    // Add optional detail
    await page.locator("textarea").fill("Valuation too high for current traction.");

    // Confirm — button enabled now that category selected
    await page.locator("button", { hasText: /Confirm pass/i }).click();

    // Wait for toast / modal to close
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "/tmp/pw-decisions-6-pass.png" });

    // DB assertion
    const rows = await serviceGet(`investor_watchlist?id=eq.${DELTA_ID}&select=status,pass_reason_category,pass_reason_detail`);
    console.log("DB after pass:", JSON.stringify(rows[0]));
    expect(rows[0].status).toBe("Passed");
    expect(rows[0].pass_reason_category).toBe("Valuation");
    expect(rows[0].pass_reason_detail).toBe("Valuation too high for current traction.");

    // decisions table — service key bypasses RLS
    const decisions = await serviceGet(`decisions?decided_by=eq.${INVESTOR_ID}&decision_type=eq.pass&order=created_at.desc&limit=1&select=pass_reason_category,status,decision_type`);
    console.log("Decisions row:", JSON.stringify(decisions[0]));
    expect(decisions[0]?.pass_reason_category).toBe("Valuation");

    console.log("✓ Pass form: watchlist status=Passed, pass_reason_category=Valuation written to DB");
    await ctx.close();
  });

});
