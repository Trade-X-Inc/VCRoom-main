/**
 * Playwright tests: DR-4 (Term Sheet) + DR-5 (Closing) stage panels
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

const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL || "test-investor@hockystick.app";
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;
const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL || "test-founder@hockystick.app";
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;

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

async function openDealRoomTab(ctx: BrowserContext, session: any, tabTestId: string) {
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
  const tab = page.getByTestId(tabTestId);
  await expect(tab).toBeVisible({ timeout: 10000 });
  // Force click — tab may still be marked disabled in first render before query settles
  await tab.click({ force: true });
  await page.waitForTimeout(2000);
  return page;
}

let investorSession: any;
let founderSession: any;

test.beforeAll(async () => {
  [investorSession, founderSession] = await Promise.all([
    getSession(INVESTOR_EMAIL, INVESTOR_PASS),
    getSession(FOUNDER_EMAIL, FOUNDER_PASS),
  ]);

  // Advance deal room to term_sheet stage so tabs are accessible
  await fetch(
    `${SUPABASE_URL}/rest/v1/deal_rooms?id=eq.${DEAL_ROOM_ID}`,
    {
      method: "PATCH",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      // "closed" unlocks all tabs including term_sheet and closing
      body: JSON.stringify({ workflow_stage: "closed" }),
    },
  );
});

test.describe("DR-4 + DR-5: Term Sheet and Closing stage panels", () => {

  test("1. Term Sheet tab loads for investor — no crash", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDealRoomTab(ctx, investorSession, "stage-pill-term_sheet");

    console.log("\n── TEST 1: Term Sheet tab ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const body = await page.textContent("body") ?? "";
    const hasTS = body.includes("Term Sheet") || body.includes("Draft term sheet") || body.includes("term sheet");
    console.log(`Term Sheet content present: ${hasTS}`);
    expect(hasTS).toBe(true);

    const hasCrash = body.includes("Something went wrong") || body.includes("ChunkLoadError");
    expect(hasCrash).toBe(false);
    const hasRefError = errors.some((e) => e.includes("is not defined") || e.includes("ReferenceError"));
    expect(hasRefError).toBe(false);
    console.log(`JS errors: ${errors.length > 0 ? errors.slice(0, 3).join("; ") : "none"}`);

    await page.screenshot({ path: "/tmp/pw-dr4-1.png" });
    await ctx.close();
  });

  test("2. Term sheet form fields present — investor view", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDealRoomTab(ctx, investorSession, "stage-pill-term_sheet");

    console.log("\n── TEST 2: Term Sheet form ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    const body = await page.textContent("body") ?? "";

    // Either show Draft button (no sheets) or Edit/send buttons (sheets exist)
    const hasDraftBtn = body.includes("Draft term sheet");
    const hasVersionList = body.includes("Term Sheet v") || body.includes("New version");
    console.log(`Draft button: ${hasDraftBtn}, Version list: ${hasVersionList}`);
    expect(hasDraftBtn || hasVersionList).toBe(true);

    if (hasDraftBtn) {
      // Click draft to open editor
      const draftBtn = page.getByTestId("draft-term-sheet-btn");
      await expect(draftBtn).toBeVisible({ timeout: 5000 });
      await draftBtn.click();
      await page.waitForTimeout(1000);
    }

    // AI draft button should be in editor
    const aiBtn = page.getByTestId("ai-draft-term-sheet-btn");
    const aiBtnVisible = await aiBtn.isVisible().catch(() => false);
    console.log(`AI draft button visible: ${aiBtnVisible}`);
    expect(aiBtnVisible).toBe(true);

    // Form fields
    const bodyAfter = await page.textContent("body") ?? "";
    const hasFormFields = bodyAfter.includes("Investment amount") || bodyAfter.includes("Valuation") || bodyAfter.includes("Equity");
    console.log(`Form fields present: ${hasFormFields}`);
    expect(hasFormFields).toBe(true);

    await page.screenshot({ path: "/tmp/pw-dr4-2.png" });
    await ctx.close();
  });

  test("3. Closing tab loads — checklist seeded", async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext();
    const page = await openDealRoomTab(ctx, investorSession, "stage-pill-closing");

    console.log("\n── TEST 3: Closing tab ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    const body = await page.textContent("body") ?? "";
    const hasClosing = body.includes("Closing") || body.includes("checklist") || body.includes("Checklist");
    console.log(`Closing content present: ${hasClosing}`);
    expect(hasClosing).toBe(true);

    const hasLoadBtn = body.includes("Load standard checklist");
    const hasItems = body.includes("Legal") || body.includes("Financial") || body.includes("Governance");
    console.log(`"Load standard checklist" visible: ${hasLoadBtn}, Items visible: ${hasItems}`);

    if (hasLoadBtn && !hasItems) {
      const loadBtn = page.getByTestId("load-closing-checklist-btn");
      await expect(loadBtn).toBeVisible({ timeout: 5000 });
      await loadBtn.click();
      console.log("Clicked 'Load standard checklist'");
      await page.waitForTimeout(4000);
    }

    // Query DB count
    const countResp = await fetch(
      `${SUPABASE_URL}/rest/v1/deal_room_closing_items?deal_room_id=eq.${DEAL_ROOM_ID}&select=id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const rows = await countResp.json() as any[];
    const dbCount = Array.isArray(rows) ? rows.length : 0;
    console.log(`DB count (deal_room_closing_items): ${dbCount}`);
    expect(dbCount).toBeGreaterThanOrEqual(14);

    const bodyAfter = await page.textContent("body") ?? "";
    const hasItemsAfter = bodyAfter.includes("Legal") || bodyAfter.includes("Financial") || bodyAfter.includes("Governance") || bodyAfter.includes("complete");
    console.log(`Checklist items rendered: ${hasItemsAfter}`);
    expect(hasItemsAfter).toBe(true);

    await page.screenshot({ path: "/tmp/pw-dr4-3.png" });
    await ctx.close();
  });

  test("4. Exit deal button visible — investor and founder", async ({ browser }) => {
    test.setTimeout(90000);

    // Test investor
    const ctxInv = await browser.newContext();
    const pageInv = await openDealRoomTab(ctxInv, investorSession, "stage-pill-closing");

    console.log("\n── TEST 4: Exit deal button ──");
    if (pageInv) {
      const exitBtn = pageInv.getByTestId("exit-deal-btn");
      await expect(exitBtn).toBeVisible({ timeout: 10000 });
      console.log("Investor: exit-deal-btn visible");
      await pageInv.screenshot({ path: "/tmp/pw-dr4-4-investor.png" });
    } else {
      console.log("Investor: NDA redirect — skipping investor check");
    }
    await ctxInv.close();

    // Test founder
    const ctxFnd = await browser.newContext();
    const pageFnd = await openDealRoomTab(ctxFnd, founderSession, "stage-pill-closing");
    if (pageFnd) {
      const exitBtnFnd = pageFnd.getByTestId("exit-deal-btn");
      await expect(exitBtnFnd).toBeVisible({ timeout: 10000 });
      console.log("Founder: exit-deal-btn visible");
      await pageFnd.screenshot({ path: "/tmp/pw-dr4-4-founder.png" });
    } else {
      console.log("Founder: NDA redirect — skipping founder check");
    }
    await ctxFnd.close();
  });

});
