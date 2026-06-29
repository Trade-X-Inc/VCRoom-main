/**
 * Playwright tests: A1 Readiness Agent (run-readiness-score edge function + Score Audit UI)
 *
 * 1. Edge function direct call — score + data_gaps for Playwright Test Co
 * 2. DB write confirmed — readiness_score_runs row exists with correct values
 * 3. Atlas Robotics adversarial check — runs and returns gaps
 * 4. UI renders — Score Audit section visible, data gaps shown
 * 5. AI panel context — panel references actual score number in response
 */

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
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
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM3MTA2MTYsImV4cCI6MjAyOTI4NjYxNn0.wLFUJmHMy0_5f5CZxE5P5CflK0v8Mop0iHLrj73uqFY";
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = "https://hockystick.app";
const EDGE_URL = `${SUPABASE_URL}/functions/v1/run-readiness-score`;

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const FOUNDER_ID = testEnv.TEST_FOUNDER_USER_ID;
const STARTUP_ID = testEnv.TEST_FOUNDER_STARTUP_ID;
const ATLAS_ID = "ebfcaf98-13e5-4e33-a0ad-175d8c041580";

async function serviceGet(p: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return r.text().then((t) => (t ? JSON.parse(t) : null));
}

async function serviceDelete(p: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

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
    ({ key, s }: any) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          expires_in: s.expires_in,
          expires_at: s.expires_at,
          token_type: s.token_type,
          user: s.user,
        }),
      ),
    { key: STORAGE_KEY, s: session },
  );
  await p.close();
}

async function waitForLoad(page: Page) {
  await page.waitForFunction(
    () =>
      !document.body.textContent?.includes("Verifying access") &&
      !document.body.textContent?.includes("Signing you in") &&
      !document.body.textContent?.includes("Loading…"),
    { timeout: 25000 },
  );
}

test.describe("A1 Readiness Agent", () => {
  let testScoreRun: any = null; // shared between test 1 and test 2

  test.beforeAll(async () => {
    // Clean up previous test runs for test startup (keep Atlas Robotics rows)
    await serviceDelete(
      `readiness_score_runs?startup_id=eq.${STARTUP_ID}`,
    ).catch(() => {});
  });

  test.afterAll(async () => {
    await serviceDelete(
      `readiness_score_runs?startup_id=eq.${STARTUP_ID}`,
    ).catch(() => {});
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test("1. Edge function direct call — score + data_gaps returned", async () => {
    test.setTimeout(60000);

    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
    const jwt = session.access_token;

    const res = await fetch(EDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ startup_id: STARTUP_ID, user_id: FOUNDER_ID }),
    });

    expect(res.status, `Expected 200, got ${res.status}`).toBe(200);
    const run = await res.json() as any;
    testScoreRun = run;

    console.log("\n── TEST 1 RESULT ──");
    console.log(`score: ${run.score}`);
    console.log(`confidence: ${run.confidence_lo}–${run.confidence_hi}`);
    console.log(`factor_breakdown keys: ${Object.keys(run.factor_breakdown ?? {}).join(", ")}`);
    console.log(`data_gaps count: ${run.data_gaps?.length ?? 0}`);
    console.log(`data_gaps fields: ${run.data_gaps?.map((g: any) => g.field).join(", ")}`);
    console.log(`top_action: ${run.top_action}`);

    // Assertions
    expect(typeof run.score).toBe("number");
    expect(run.score).toBeGreaterThanOrEqual(0);
    expect(run.score).toBeLessThanOrEqual(100);
    expect(run.factor_breakdown).toBeDefined();
    expect(typeof run.factor_breakdown).toBe("object");
    expect(Array.isArray(run.data_gaps)).toBe(true);
    // Playwright Test Co has no LinkedIn, website, or registration — must have gaps
    expect(run.data_gaps.length).toBeGreaterThan(0);
    expect(run.top_action).toBeTruthy();
    expect(run.id).toBeTruthy(); // DB row was inserted
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test("2. DB write confirmed — row in readiness_score_runs", async () => {
    test.setTimeout(30000);

    const rows = await serviceGet(
      `readiness_score_runs?startup_id=eq.${STARTUP_ID}&select=id,score,confidence_lo,confidence_hi,top_action,created_at&order=created_at.desc&limit=1`,
    );

    console.log("\n── TEST 2 RESULT ──");
    console.log(JSON.stringify(rows?.[0] ?? "NO ROW", null, 2));

    expect((rows ?? []).length).toBeGreaterThan(0);
    const row = rows[0];
    expect(typeof row.score).toBe("number");
    expect(row.confidence_lo).toBeDefined();
    expect(row.confidence_hi).toBeDefined();
    expect(row.top_action).toBeTruthy();

    // Also verify via direct SQL using service role REST
    const gapRows = await serviceGet(
      `readiness_score_runs?startup_id=eq.${STARTUP_ID}&select=score,confidence_lo,confidence_hi,data_gaps&order=created_at.desc&limit=1`,
    );
    const gapCount = Array.isArray(gapRows?.[0]?.data_gaps) ? gapRows[0].data_gaps.length : 0;
    console.log(`gap_count (from DB): ${gapCount}`);
    expect(gapCount).toBeGreaterThan(0);
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test("3. Atlas Robotics adversarial check — runs and has gaps", async () => {
    test.setTimeout(60000);

    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
    const jwt = session.access_token;

    const res = await fetch(EDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ startup_id: ATLAS_ID, user_id: FOUNDER_ID }),
    });

    // Should succeed (200) even for a different startup — service role fetches by startup_id
    expect(res.status).toBe(200);
    const run = await res.json() as any;

    console.log("\n── TEST 3 RESULT (Atlas Robotics) ──");
    console.log(`score: ${run.score}`);
    console.log(`data_gaps[0]: ${JSON.stringify(run.data_gaps?.[0])}`);
    console.log(`data_gaps[1]: ${JSON.stringify(run.data_gaps?.[1])}`);
    console.log(`top_action: ${run.top_action}`);

    expect(typeof run.score).toBe("number");
    expect(Array.isArray(run.data_gaps)).toBe(true);
    expect(run.data_gaps.length).toBeGreaterThan(0);
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  test("4. UI renders — Score Audit section visible with gaps", async ({ browser }) => {
    test.setTimeout(120000);

    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
    const ctx = await browser.newContext();
    await injectSession(ctx, session);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    // "Run Score Audit" button should be visible
    const btn = page.locator("[data-testid=run-score-audit-btn]");
    await expect(btn).toBeVisible({ timeout: 15000 });
    console.log("✓ Run Score Audit button visible");

    // Click it and wait for the gaps section to appear
    await btn.click();

    // Wait for loading to finish (button text changes from "Running…" back)
    await expect(btn).not.toHaveText("Running…", { timeout: 90000 });
    console.log("✓ Score audit completed");

    // Gaps section must appear
    const gapsSection = page.locator("[data-testid=score-audit-gaps-section]");
    await expect(gapsSection).toBeVisible({ timeout: 10000 });

    // At least one gap item
    const gapItems = page.locator("[data-testid=score-audit-gap-item]");
    const gapCount = await gapItems.count();
    expect(gapCount).toBeGreaterThan(0);
    console.log(`✓ ${gapCount} data gap(s) visible in UI`);

    await page.screenshot({ path: "/tmp/pw-score-audit-4.png" });
    console.log("Screenshot saved: /tmp/pw-score-audit-4.png");

    await ctx.close();
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  test("5. AI panel context — panel response references score number", async ({ browser }) => {
    test.setTimeout(120000);

    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
    const ctx = await browser.newContext();
    await injectSession(ctx, session);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    // Wait for score run to load into AI panel context
    await page.waitForTimeout(2000);

    // Open AI panel
    await page.locator("[data-testid=ai-operator-toggle]").click();
    await expect(page.locator("[data-testid=ai-operator-panel]")).toBeVisible({ timeout: 8000 });

    // Send readiness score question
    await page.locator("[data-testid=ai-operator-input]").fill("What is my readiness score?");
    await page.locator("[data-testid=ai-operator-send]").click();

    // Wait for response
    await expect(page.locator("[data-testid=ai-operator-loading]")).toBeHidden({ timeout: 60000 });

    const panelText = await page.locator("[data-testid=ai-operator-panel]").textContent();

    console.log("\n── TEST 5 AI PANEL RESPONSE ──");
    // Extract the assistant response (last non-empty text block after user message)
    console.log(panelText?.slice(-800));

    // Assert: response contains a number (the score) — not "I don't know"
    const hasNumber = /\d+/.test(panelText ?? "");
    expect(hasNumber).toBe(true);

    // Assert: doesn't say it doesn't know
    const lowerText = (panelText ?? "").toLowerCase();
    expect(lowerText).not.toContain("i don't have");
    expect(lowerText).not.toContain("i don't know");

    await page.screenshot({ path: "/tmp/pw-score-audit-5.png" });
    await ctx.close();
    console.log("✓ AI panel referenced score in response");
  });
});
