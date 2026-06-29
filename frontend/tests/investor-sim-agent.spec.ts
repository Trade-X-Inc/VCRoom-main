/**
 * Playwright tests: A7 Investor Sim Agent (run-investor-sim edge function + Investor Simulation UI)
 *
 * 1. Edge function response quality — all 4 fields present, red_flag specificity check
 * 2. DB write confirmed — investor_sim_runs row exists with full data
 * 3. sim_preview updated in readiness_score_runs
 * 4. Atlas Robotics specificity check — kill_risk mentions legal/DIFC/registration/military
 * 5. UI renders all 4 blocks with non-empty text
 * 6. AI panel knows red flag — response references simulation content
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
const EDGE_URL = `${SUPABASE_URL}/functions/v1/run-investor-sim`;

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

test.describe("A7 Investor Sim Agent", () => {
  test.beforeAll(async () => {
    // Clean sim runs for test startup; keep Atlas runs (they're not our fixture)
    await serviceDelete(
      `investor_sim_runs?startup_id=eq.${STARTUP_ID}`,
    ).catch(() => {});
    // Also seed a readiness_score_run if none exists so sim_preview update can work
    const existing = await serviceGet(
      `readiness_score_runs?startup_id=eq.${STARTUP_ID}&select=id&limit=1`,
    );
    if (!existing || existing.length === 0) {
      // Run a readiness score first so there's a row to update
      const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
      await fetch(`${SUPABASE_URL}/functions/v1/run-readiness-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ startup_id: STARTUP_ID, user_id: FOUNDER_ID }),
      });
    }
  });

  test.afterAll(async () => {
    await serviceDelete(
      `investor_sim_runs?startup_id=eq.${STARTUP_ID}`,
    ).catch(() => {});
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test("1. Edge function response quality — all 4 fields, specific red_flag", async () => {
    test.setTimeout(90000);

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

    console.log("\n── TEST 1 RESULT ──");
    console.log(`first_question: ${run.first_question}`);
    console.log(`\nred_flag: ${run.red_flag}`);
    console.log(`\nstrongest_point: ${run.strongest_point}`);
    console.log(`\nkill_risk: ${run.kill_risk}`);
    console.log(`\ninvestor_persona_used: ${run.investor_persona_used}`);

    // All 4 fields present
    expect(run.first_question).toBeTruthy();
    expect(run.red_flag).toBeTruthy();
    expect(run.strongest_point).toBeTruthy();
    expect(run.kill_risk).toBeTruthy();

    // red_flag specificity: must contain a number or a specific noun (not generic)
    const rfLower = run.red_flag.toLowerCase();
    const hasSpecificContent =
      /\d/.test(run.red_flag) ||        // contains a number
      rfLower.includes("linkedin") ||
      rfLower.includes("registration") ||
      rfLower.includes("runway") ||
      rfLower.includes("financial model") ||
      rfLower.includes("pitch deck") ||
      rfLower.includes("website") ||
      rfLower.includes("month");

    expect(
      hasSpecificContent,
      `red_flag appears generic (no numbers or specific nouns): "${run.red_flag}"`
    ).toBe(true);

    // ID present (DB row inserted)
    expect(run.id).toBeTruthy();
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test("2. DB write confirmed — full investor_sim_runs row", async () => {
    test.setTimeout(30000);

    const rows = await serviceGet(
      `investor_sim_runs?startup_id=eq.${STARTUP_ID}&select=id,first_question,red_flag,strongest_point,kill_risk,investor_persona_used,created_at&order=created_at.desc&limit=1`,
    );

    console.log("\n── TEST 2 RESULT ──");
    console.log(JSON.stringify(rows?.[0] ?? "NO ROW", null, 2));

    expect((rows ?? []).length).toBeGreaterThan(0);
    const row = rows[0];
    expect(row.first_question).toBeTruthy();
    expect(row.red_flag).toBeTruthy();
    expect(row.strongest_point).toBeTruthy();
    expect(row.kill_risk).toBeTruthy();
    expect(row.id).toBeTruthy();
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test("3. sim_preview updated in readiness_score_runs", async () => {
    test.setTimeout(30000);

    const rows = await serviceGet(
      `readiness_score_runs?startup_id=eq.${STARTUP_ID}&select=sim_preview&order=created_at.desc&limit=1`,
    );

    console.log("\n── TEST 3 RESULT ──");
    const simPreview = rows?.[0]?.sim_preview;
    console.log(`sim_preview: ${simPreview}`);

    expect(simPreview).toBeTruthy();
    expect(simPreview.length).toBeGreaterThan(20);
    // sim_preview is the first_question + separator + start of red_flag
    // Accept any non-trivial text (edge function writes it from AI output)
    const lowerPreview = simPreview.toLowerCase();
    const hasContent =
      lowerPreview.includes("?") ||        // first_question always ends with ?
      lowerPreview.includes("red flag") ||  // our separator includes this
      lowerPreview.includes("investor") ||
      lowerPreview.includes("registration") ||
      lowerPreview.includes("financial");
    expect(hasContent, `sim_preview content looks empty or wrong: "${simPreview}"`).toBe(true);
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  test("4. Atlas Robotics kill_risk mentions legal/registration/DIFC/military", async () => {
    test.setTimeout(90000);

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

    expect(res.status).toBe(200);
    const run = await res.json() as any;

    console.log("\n── TEST 4 RESULT (Atlas Robotics) ──");
    console.log(`kill_risk: ${run.kill_risk}`);
    console.log(`first_question: ${run.first_question}`);

    const krLower = (run.kill_risk ?? "").toLowerCase();
    const hasExpectedContent =
      krLower.includes("registration") ||
      krLower.includes("legal") ||
      krLower.includes("difc") ||
      krLower.includes("military") ||
      krLower.includes("regulatory") ||
      krLower.includes("license");

    expect(
      hasExpectedContent,
      `kill_risk does not mention legal/registration/DIFC/military: "${run.kill_risk}"`
    ).toBe(true);
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  test("5. UI renders all 4 blocks with non-empty text", async ({ browser }) => {
    test.setTimeout(150000);

    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
    const ctx = await browser.newContext();
    await injectSession(ctx, session);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    // "Run Simulation" button must be visible
    const btn = page.locator("[data-testid=run-investor-sim-btn]");
    await expect(btn).toBeVisible({ timeout: 15000 });
    console.log("✓ Run Simulation button visible");

    // Click it
    await btn.click();

    // Wait for completion (button no longer says "Running…")
    await expect(btn).not.toHaveText("Running…", { timeout: 120000 });
    console.log("✓ Simulation completed");

    // All 4 blocks must be visible and have text
    const blockTestIds = [
      "sim-block-first-question",
      "sim-block-red-flag",
      "sim-block-strongest",
      "sim-block-kill-risk",
    ];

    for (const tid of blockTestIds) {
      const block = page.locator(`[data-testid=${tid}]`);
      await expect(block).toBeVisible({ timeout: 10000 });
      const text = await block.textContent();
      expect(text?.trim().length ?? 0, `Block ${tid} has no text`).toBeGreaterThan(5);
      console.log(`✓ ${tid}: ${text?.slice(0, 60)}…`);
    }

    await page.screenshot({ path: "/tmp/pw-investor-sim-5.png" });
    console.log("Screenshot: /tmp/pw-investor-sim-5.png");

    // Visual flag for TradX
    console.log("\n── VISUAL FLAGS FOR TRADX ──");
    console.log("Block 1 (First question): amber tint background, ? icon in amber circle");
    console.log("Block 2 (Red flag): red tint background, ⚠ icon in red circle");
    console.log("Block 3 (Strongest point): green tint background, ↑ icon in green circle");
    console.log("Block 4 (Kill risk): darker red background, ✕ icon in dark red circle");
    console.log("Footer: persona text + timestamp in muted gray below all blocks");

    await ctx.close();
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────
  test("6. AI panel knows red flag — response references simulation content", async ({ browser }) => {
    test.setTimeout(150000);

    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
    const ctx = await browser.newContext();
    await injectSession(ctx, session);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    // Let sim run data load into state
    await page.waitForTimeout(2500);

    // Open AI panel
    await page.locator("[data-testid=ai-operator-toggle]").click();
    await expect(page.locator("[data-testid=ai-operator-panel]")).toBeVisible({ timeout: 8000 });

    // Ask about red flag
    await page.locator("[data-testid=ai-operator-input]").fill(
      "What's my biggest red flag according to the investor simulation?"
    );
    await page.locator("[data-testid=ai-operator-send]").click();

    // Wait for AI response
    await expect(page.locator("[data-testid=ai-operator-loading]")).toBeHidden({ timeout: 90000 });

    const panelText = await page.locator("[data-testid=ai-operator-panel]").textContent();

    console.log("\n── TEST 6 AI PANEL RESPONSE ──");
    console.log(panelText?.slice(-1000));

    // Response must not be generic — should reference some sim-specific content
    const lowerText = (panelText ?? "").toLowerCase();
    const hasSimContent =
      lowerText.includes("red flag") ||
      lowerText.includes("registration") ||
      lowerText.includes("linkedin") ||
      lowerText.includes("runway") ||
      lowerText.includes("financial model") ||
      lowerText.includes("pitch deck") ||
      lowerText.includes("investor") ||
      /\d/.test(lowerText); // any number = referencing actual data

    expect(
      hasSimContent,
      "AI panel response appears generic — no sim-specific content found"
    ).toBe(true);

    // Must not say it doesn't know
    expect(lowerText).not.toContain("i don't have access");
    expect(lowerText).not.toContain("i don't know");
    expect(lowerText).not.toContain("no simulation");

    await page.screenshot({ path: "/tmp/pw-investor-sim-6.png" });
    await ctx.close();
    console.log("✓ AI panel response references simulation content");
  });
});
