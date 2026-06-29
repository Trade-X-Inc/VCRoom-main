/**
 * Playwright tests: DR-3 — Due Diligence stage panel
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
const DEAL_ROOM_ID = "957f9750-00c7-402a-b1ba-d9c7a4e3ba2f";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL || "test-founder@hockystick.app";
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL || "test-investor@hockystick.app";
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;

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

async function injectSession(ctx: BrowserContext, session: any, theme = "light") {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(({ key, val, themeKey, themeVal }: any) => {
    localStorage.setItem(key, JSON.stringify(val));
    localStorage.setItem(themeKey, themeVal);
    localStorage.setItem("hs_ai_panel_open", "false");
  }, {
    key: STORAGE_KEY, themeKey: "vr.theme", themeVal: theme,
    val: {
      access_token: session.access_token, refresh_token: session.refresh_token,
      expires_in: session.expires_in, expires_at: session.expires_at,
      token_type: session.token_type, user: session.user,
    },
  });
  await p.close();
}

async function openDealRoomDD(ctx: BrowserContext, session: any) {
  await injectSession(ctx, session);
  const page = await ctx.newPage();
  await page.goto(`${APP}/app/deal-room/${DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Verifying access") &&
          !document.body.textContent?.includes("Signing you in"),
    { timeout: 30000 },
  );
  await page.waitForTimeout(2000);

  if (page.url().includes("/nda")) return null;

  const ddTab = page.getByTestId("stage-pill-due_diligence");
  await expect(ddTab).toBeVisible({ timeout: 10000 });
  await ddTab.click();
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

test.describe("DR-3: Due Diligence stage panel", () => {

  test("1. DD tab loads for investor — no crash", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDealRoomDD(ctx, investorSession);

    console.log("\n── TEST 1 ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const body = await page.textContent("body") ?? "";
    const hasDDContent = body.includes("Due Diligence") || body.includes("diligence goals") || body.includes("standard goals") || body.includes("Set up");
    console.log(`DD content present: ${hasDDContent}`);
    expect(hasDDContent).toBe(true);

    const hasCrash = body.includes("Something went wrong") || body.includes("ChunkLoadError");
    expect(hasCrash).toBe(false);

    const hasRefError = errors.some((e) => e.includes("is not defined") || e.includes("ReferenceError"));
    expect(hasRefError).toBe(false);
    console.log(`JS errors: ${errors.length > 0 ? errors.slice(0, 3).join("; ") : "none"}`);

    await page.screenshot({ path: "/tmp/pw-dr3-1.png" });
    await ctx.close();
  });

  test("2. Standard goals load — use standard goals or already seeded", async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext();
    const page = await openDealRoomDD(ctx, investorSession);

    console.log("\n── TEST 2 ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    const body = await page.textContent("body") ?? "";
    const hasOnboarding = body.includes("Use standard goals") || body.includes("standard goals");
    const hasGoalList = body.includes("Team") || body.includes("Financials") || body.includes("Market") || body.includes("Legal");

    console.log(`Onboarding card visible: ${hasOnboarding}`);
    console.log(`Goal list visible: ${hasGoalList}`);

    if (hasOnboarding && !hasGoalList) {
      // Click "Use standard goals"
      const seedBtn = page.getByTestId("dd-use-standard-goals-btn");
      await expect(seedBtn).toBeVisible({ timeout: 5000 });
      await seedBtn.click();
      console.log("Clicked 'Use standard goals'");
      await page.waitForTimeout(4000);
    }

    // Query DB count
    const countResp = await fetch(
      `${SUPABASE_URL}/rest/v1/deal_room_dd_goals?deal_room_id=eq.${DEAL_ROOM_ID}&select=id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const rows = await countResp.json() as any[];
    const dbCount = Array.isArray(rows) ? rows.length : 0;
    console.log(`DB count (deal_room_dd_goals rows): ${dbCount}`);
    expect(dbCount).toBeGreaterThanOrEqual(15);

    // Verify goal list renders
    const bodyAfter = await page.textContent("body") ?? "";
    const hasGoals = bodyAfter.includes("Team") || bodyAfter.includes("Financials") || bodyAfter.includes("Product");
    console.log(`Goal list rendered: ${hasGoals}`);
    expect(hasGoals).toBe(true);

    await page.screenshot({ path: "/tmp/pw-dr3-2.png" });
    await ctx.close();
  });

  test("3. Founder sees report view — no workstation elements", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDealRoomDD(ctx, founderSession);

    console.log("\n── TEST 3 ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    const body = await page.textContent("body") ?? "";
    const hasReportView = body.includes("Diligence Report") || body.includes("investor has not started");
    console.log(`Report view or empty state present: ${hasReportView}`);
    expect(hasReportView).toBe(true);

    // Investor workstation elements should NOT be visible to founder
    const addGoalBtn = page.getByTestId("dd-add-goal-btn");
    const addGoalVisible = await addGoalBtn.isVisible().catch(() => false);
    console.log(`"Add custom goal" button visible (should be false): ${addGoalVisible}`);
    expect(addGoalVisible).toBe(false);

    await page.screenshot({ path: "/tmp/pw-dr3-3.png" });
    await ctx.close();
  });

  test("4. AI analysis button visible for investor", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDealRoomDD(ctx, investorSession);

    console.log("\n── TEST 4 ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    const analysisBtn = page.getByTestId("dd-run-analysis-btn");
    await expect(analysisBtn).toBeVisible({ timeout: 10000 });
    console.log('"Run analysis" button visible');

    const nextStageBtn = page.getByTestId("dd-next-stage");
    await expect(nextStageBtn).toBeVisible({ timeout: 5000 });
    console.log('"Request next stage" button visible');

    await page.screenshot({ path: "/tmp/pw-dr3-4.png" });
    await ctx.close();
  });

});
