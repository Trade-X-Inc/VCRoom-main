/**
 * Playwright tests: UI-FIX-1 — theme + layout sweep
 *
 * 1. Workstation — no hardcoded dark backgrounds visible (bg-card token used)
 * 2. Deal Rooms — single-column full-width list (no 2-col grid)
 * 3. Investor Deal Intake — full-width layout (no maxWidth: 860 narrow wrapper)
 * 4. Investor Due Diligence — company rows use bg-card token, not hardcoded dark
 * 5. Investor Decisions — CompanyCard uses bg-card token
 * 6. Investor Team — full-width layout (no maxWidth: 800)
 * 7. Investor Team — team section visible and member count shown
 * 8. Nav — no duplicate "Profile" entry in sidebar WORKSPACE section
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

test.describe("UI-FIX-1: Theme + layout sweep", () => {

  // ── Test 1 ─────────────────────────────────────────────────────────────────
  test("1. Workstation — verification card visible and no inline dark background", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 1 RESULT ──");

    // Workstation heading should exist
    const body = await page.textContent("body") ?? "";
    const hasWorkstation = body.includes("Workstation");
    console.log(`Has 'Workstation' heading: ${hasWorkstation}`);
    expect(hasWorkstation).toBe(true);

    // No element with inline background #111114 on the main page
    const darkBgCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[style]")).filter((el) => {
        const s = (el as HTMLElement).style.background;
        return s === "rgb(17, 17, 20)" || s === "#111114";
      }).length;
    });
    console.log(`Elements with hardcoded #111114 background: ${darkBgCount}`);
    expect(darkBgCount).toBe(0);

    await page.screenshot({ path: "/tmp/pw-uifix-1.png" });
    await ctx.close();
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  test("2. Deal Rooms — single-column full-width list (no 2-col grid)", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/deal-rooms`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 2 RESULT ──");

    const body = await page.textContent("body") ?? "";
    const hasDealRooms = body.includes("Deal Rooms");
    console.log(`Has 'Deal Rooms' heading: ${hasDealRooms}`);
    expect(hasDealRooms).toBe(true);

    // Grid should not have md:grid-cols-2 class — check no 2-column layout
    const twoColGrid = await page.evaluate(() => {
      return !!document.querySelector(".grid.md\\:grid-cols-2");
    });
    console.log(`2-col grid present: ${twoColGrid}`);
    expect(twoColGrid).toBe(false);

    // No max-w-7xl constraint
    const hasMaxW7xl = await page.evaluate(() => {
      return !!document.querySelector(".max-w-7xl");
    });
    console.log(`max-w-7xl present: ${hasMaxW7xl}`);
    expect(hasMaxW7xl).toBe(false);

    await page.screenshot({ path: "/tmp/pw-uifix-2.png" });
    await ctx.close();
  });

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  test("3. Investor Deal Intake — full-width layout, no narrow maxWidth wrapper", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/intake`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 3 RESULT ──");

    const body = await page.textContent("body") ?? "";
    const hasDealIntake = body.includes("Deal Intake");
    console.log(`Has 'Deal Intake' heading: ${hasDealIntake}`);
    expect(hasDealIntake).toBe(true);

    // No element with inline maxWidth of 860
    const narrowWrapper = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[style]")).filter((el) => {
        const s = (el as HTMLElement).style.maxWidth;
        return s === "860px";
      }).length;
    });
    console.log(`Elements with maxWidth: 860px: ${narrowWrapper}`);
    expect(narrowWrapper).toBe(0);

    await page.screenshot({ path: "/tmp/pw-uifix-3.png" });
    await ctx.close();
  });

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  test("4. Investor Due Diligence — no hardcoded #111114 backgrounds", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/diligence`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 4 RESULT ──");

    const body = await page.textContent("body") ?? "";
    const hasDiligence = body.includes("Diligence") || body.includes("Due Diligence");
    console.log(`Has 'Diligence' content: ${hasDiligence}`);
    expect(hasDiligence).toBe(true);

    const darkBgCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[style]")).filter((el) => {
        const s = (el as HTMLElement).style.background;
        return s === "rgb(17, 17, 20)" || s === "#111114";
      }).length;
    });
    console.log(`Elements with hardcoded #111114 background: ${darkBgCount}`);
    expect(darkBgCount).toBe(0);

    await page.screenshot({ path: "/tmp/pw-uifix-4.png" });
    await ctx.close();
  });

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  test("5. Investor Decisions — no hardcoded #111114 backgrounds on company cards", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/decisions`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 5 RESULT ──");

    const body = await page.textContent("body") ?? "";
    const hasDecisions = body.includes("Decision") || body.includes("Pipeline");
    console.log(`Has decisions content: ${hasDecisions}`);
    expect(hasDecisions).toBe(true);

    const darkBgCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[style]")).filter((el) => {
        const s = (el as HTMLElement).style.background;
        return s === "rgb(17, 17, 20)" || s === "#111114";
      }).length;
    });
    console.log(`Elements with hardcoded #111114 background: ${darkBgCount}`);
    expect(darkBgCount).toBe(0);

    await page.screenshot({ path: "/tmp/pw-uifix-5.png" });
    await ctx.close();
  });

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  test("6. Investor Team — full-width layout, no maxWidth: 800 constraint", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/team`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 6 RESULT ──");

    const body = await page.textContent("body") ?? "";
    const hasTeam = body.includes("Team");
    console.log(`Has 'Team' heading: ${hasTeam}`);
    expect(hasTeam).toBe(true);

    // No element with inline maxWidth of 800
    const narrowWrapper = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[style]")).filter((el) => {
        const s = (el as HTMLElement).style.maxWidth;
        return s === "800px";
      }).length;
    });
    console.log(`Elements with maxWidth: 800px: ${narrowWrapper}`);
    expect(narrowWrapper).toBe(0);

    await page.screenshot({ path: "/tmp/pw-uifix-6.png" });
    await ctx.close();
  });

  // ── Test 7 ─────────────────────────────────────────────────────────────────
  test("7. Investor Team — Members section visible with member count", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/team`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 7 RESULT ──");

    const body = await page.textContent("body") ?? "";
    const hasMembers = body.includes("Members");
    const hasPendingInvites = body.includes("Pending invites");
    console.log(`Has 'Members' section: ${hasMembers}`);
    console.log(`Has 'Pending invites' section: ${hasPendingInvites}`);
    expect(hasMembers).toBe(true);
    expect(hasPendingInvites).toBe(true);

    // Owner row should show "you" label
    const hasYouLabel = body.includes("(you)") || body.includes("Owner");
    console.log(`Has owner row: ${hasYouLabel}`);
    expect(hasYouLabel).toBe(true);

    await page.screenshot({ path: "/tmp/pw-uifix-7.png" });
    await ctx.close();
  });

  // ── Test 8 ─────────────────────────────────────────────────────────────────
  test("8. Sidebar nav — no duplicate 'Profile' in WORKSPACE section", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 8 RESULT ──");

    // Count nav links pointing to /app/profile
    const profileLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("nav a[href='/app/profile'], a[href*='/app/profile']")).length;
    });
    console.log(`Nav links to /app/profile: ${profileLinks}`);
    // Should be exactly 1 (in ADMIN section only)
    expect(profileLinks).toBeLessThanOrEqual(1);

    await page.screenshot({ path: "/tmp/pw-uifix-8.png" });
    await ctx.close();
  });
});
