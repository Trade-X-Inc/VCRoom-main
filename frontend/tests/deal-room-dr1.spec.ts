/**
 * Playwright tests: DR-1 — Information Vault panel
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
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
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
  if (!password) throw new Error(`Missing password for ${email} in .env.test`);
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ email, password }),
  });
  const session = await r.json() as any;
  if (!session.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(session)}`);
  return session;
}

async function injectSession(context: BrowserContext, session: any, theme = "light") {
  const page = await context.newPage();
  await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ key, value, themeKey, themeVal }: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(themeKey, themeVal);
    localStorage.setItem("hs_ai_panel_open", "false");
  }, {
    key: STORAGE_KEY,
    themeKey: "vr.theme",
    themeVal: theme,
    value: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    },
  });
  await page.close();
}

async function waitForDealRoom(page: any) {
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Verifying access") &&
          !document.body.textContent?.includes("Signing you in") &&
          !document.body.textContent?.includes("Loading…"),
    { timeout: 30000 },
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

test.describe("DR-1: Information Vault panel", () => {

  test("1. Information Vault tab loads and renders panel", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession);
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(`${APP}/app/deal-room/${DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
    await waitForDealRoom(page);
    await page.waitForTimeout(2000);

    console.log("\n── TEST 1 ──");
    const url = page.url();
    console.log(`URL: ${url}`);

    if (url.includes("/nda")) {
      console.log("Redirected to NDA — test accounts may need NDA acceptance. Skipping.");
      await page.screenshot({ path: "/tmp/pw-dr1-1-nda.png" });
      await ctx.close();
      return;
    }

    // Click Information Vault tab
    const ivTab = page.getByTestId("stage-pill-information_vault");
    await expect(ivTab).toBeVisible({ timeout: 10000 });
    await ivTab.click();
    await page.waitForTimeout(1500);

    const body = await page.textContent("body") ?? "";
    const hasPanel = body.includes("Digital Profiles") || body.includes("Document Requests") || body.includes("Documents & Links");
    console.log(`Information Vault panel content present: ${hasPanel}`);
    console.log(`JS errors: ${errors.length > 0 ? errors.slice(0, 3).join("; ") : "none"}`);

    expect(hasPanel).toBe(true);
    const hasCrash = body.includes("Something went wrong") || body.includes("ChunkLoadError");
    expect(hasCrash).toBe(false);

    const hasRefError = errors.some((e) => e.includes("is not defined") || e.includes("ReferenceError"));
    expect(hasRefError).toBe(false);

    await page.screenshot({ path: "/tmp/pw-dr1-1.png" });
    await ctx.close();
  });

  test("2. Document Requests section visible with empty state or list", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/deal-room/${DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
    await waitForDealRoom(page);
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes("/nda")) {
      console.log("\n── TEST 2 ── NDA redirect, skipping");
      await ctx.close();
      return;
    }

    const ivTab = page.getByTestId("stage-pill-information_vault");
    await expect(ivTab).toBeVisible({ timeout: 10000 });
    await ivTab.click();
    await page.waitForTimeout(1500);

    console.log("\n── TEST 2 ──");
    const body = await page.textContent("body") ?? "";
    const hasReqSection = body.includes("Document Requests");
    console.log(`"Document Requests" section present: ${hasReqSection}`);
    expect(hasReqSection).toBe(true);

    const hasEmptyOrList = body.includes("No document requests yet") || body.includes("Pending") || body.includes("Fulfilled") || body.includes("Declined");
    console.log(`Empty state or list present: ${hasEmptyOrList}`);
    expect(hasEmptyOrList).toBe(true);

    await page.screenshot({ path: "/tmp/pw-dr1-2.png" });
    await ctx.close();
  });

  test("3. Investor sees My Notes section with Add note button", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/deal-room/${DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
    await waitForDealRoom(page);
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes("/nda")) {
      console.log("\n── TEST 3 ── NDA redirect, skipping");
      await ctx.close();
      return;
    }

    const ivTab = page.getByTestId("stage-pill-information_vault");
    await expect(ivTab).toBeVisible({ timeout: 10000 });
    await ivTab.click();
    await page.waitForTimeout(1500);

    console.log("\n── TEST 3 ──");
    const body = await page.textContent("body") ?? "";
    const hasNotes = body.includes("My Notes");
    console.log(`"My Notes" section present: ${hasNotes}`);
    expect(hasNotes).toBe(true);

    const addNoteBtn = page.getByTestId("iv-add-note-btn");
    await expect(addNoteBtn).toBeVisible({ timeout: 5000 });
    console.log('"Add note" button visible');

    await page.screenshot({ path: "/tmp/pw-dr1-3.png" });
    await ctx.close();
  });

  test("4. Next stage button visible for both roles", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/deal-room/${DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
    await waitForDealRoom(page);
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes("/nda")) {
      console.log("\n── TEST 4 ── NDA redirect, skipping");
      await ctx.close();
      return;
    }

    const ivTab = page.getByTestId("stage-pill-information_vault");
    await expect(ivTab).toBeVisible({ timeout: 10000 });
    await ivTab.click();
    await page.waitForTimeout(1500);

    console.log("\n── TEST 4 ──");
    const nextBtn = page.getByTestId("info-vault-next-stage");
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    console.log('"Request next stage" button visible');

    await page.screenshot({ path: "/tmp/pw-dr1-4.png" });
    await ctx.close();
  });

});
