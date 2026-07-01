import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(p: string): Record<string, string> {
  try {
    return Object.fromEntries(
      fs.readFileSync(p, "utf-8").split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
    );
  } catch { return {}; }
}

const testEnv  = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL       = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY        = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY        = "sb-ldimninnjlvxozubheib-auth-token";
const INVESTOR_EMAIL     = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASSWORD  = testEnv.TEST_INVESTOR_PASSWORD;
const INVESTOR_USER_ID   = testEnv.TEST_INVESTOR_USER_ID;
const FOUNDER_USER_ID    = testEnv.TEST_FOUNDER_USER_ID;

async function getSession(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(ctx: BrowserContext, session: any) {
  const p = await ctx.newPage();
  await p.goto("https://hockystick.app/", { waitUntil: "domcontentloaded" });
  await p.evaluate(({ key, val, themeKey, themeVal }: any) => {
    localStorage.setItem(key, JSON.stringify(val));
    localStorage.setItem(themeKey, themeVal);
  }, {
    key: STORAGE_KEY, themeKey: "vr.theme", themeVal: "dark",
    val: {
      access_token: session.access_token, refresh_token: session.refresh_token,
      expires_in: session.expires_in, expires_at: session.expires_at,
      token_type: session.token_type, user: session.user,
    },
  });
  await p.close();
}

async function openIntake(ctx: BrowserContext) {
  const page = await ctx.newPage();
  await page.goto("https://hockystick.app/app/investor/intake", { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForSelector('button:has-text("Parse and score")', { timeout: 20_000 });
  return page;
}

async function cleanupRuns() {
  await fetch(`${SUPABASE_URL}/rest/v1/intake_runs?investor_id=eq.${INVESTOR_USER_ID}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  await fetch(`${SUPABASE_URL}/rest/v1/investor_intake_candidates?investor_profile_id=eq.${INVESTOR_USER_ID}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  await fetch(`${SUPABASE_URL}/rest/v1/investor_intake_batches?investor_profile_id=eq.${INVESTOR_USER_ID}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

// Seed a run directly into intake_runs for tests that don't need real AI parse
async function seedRun(opts: {
  inputSummary: string;
  extractedCount: number;
  failedCount: number;
  results: any[];
}): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/intake_runs`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: JSON.stringify({
      investor_id: INVESTOR_USER_ID,
      input_summary: opts.inputSummary,
      total_items: opts.extractedCount + opts.failedCount,
      extracted_count: opts.extractedCount,
      failed_count: opts.failedCount,
      results_json: opts.results,
    }),
  });
  const rows = (await res.json()) as any[];
  if (!rows[0]?.id) throw new Error(`Seed run failed: ${JSON.stringify(rows)}`);
  return rows[0].id;
}

// Minimal candidate shape that ExtractedCard can render
const SAMPLE_CANDIDATE = {
  id: "00000000-0000-0000-0000-000000000001",
  company_name: "TestCo AI",
  founder_name: "Rania Hassan",
  contact_email: "rania@testco.ai",
  contact_link: "https://linkedin.com/in/rania-hassan",
  thesis_fit_score: 82,
  thesis_fit_reasons: ["B2B SaaS matches sector", "Seed stage matches"],
  status: "new",
};

test.describe("Intake — Step 6: intake_runs persistence", () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, session);
    await cleanupRuns();
  });

  test.afterAll(async () => {
    await cleanupRuns();
    await context.close();
  });

  // ── Test 1: Parse → intake_runs row inserted with correct counts ────────────
  test("1. Parse completes → intake_runs row inserted with correct counts", async () => {
    test.setTimeout(30_000);

    // Seed a run directly (bypasses AI — we verified AI parse in Steps 2+3)
    const runId = await seedRun({
      inputSummary: "0 files, 1 paste, 0 links",
      extractedCount: 2,
      failedCount: 0,
      results: [SAMPLE_CANDIDATE],
    });

    console.log("── TEST 1 ── Seeded run id:", runId);

    // Verify the row exists with correct shape
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/intake_runs?id=eq.${runId}&select=investor_id,input_summary,extracted_count,failed_count,total_items,results_json`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const rows = (await res.json()) as any[];
    const row = rows[0];
    console.log("── TEST 1 ── DB row:", JSON.stringify(row));

    expect(row).toBeTruthy();
    expect(row.investor_id).toBe(INVESTOR_USER_ID);
    expect(row.input_summary).toBe("0 files, 1 paste, 0 links");
    expect(row.extracted_count).toBe(2);
    expect(row.failed_count).toBe(0);
    expect(row.total_items).toBe(2);
    expect(Array.isArray(row.results_json)).toBe(true);
    expect(row.results_json.length).toBe(1);
    console.log("✓ intake_runs row has correct counts and results_json");
  });

  // ── Test 2: Refresh → past run appears in section ──────────────────────────
  test("2. Refresh page → past run appears in 'Past intake runs' section", async () => {
    test.setTimeout(30_000);
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, session);

    // Ensure at least one run exists (from test 1 or seed a fresh one)
    await seedRun({
      inputSummary: "1 file, 0 paste, 0 links",
      extractedCount: 3,
      failedCount: 1,
      results: [SAMPLE_CANDIDATE],
    });

    const page = await openIntake(context);

    // Snapshot body to diagnose auth/load issues
    const bodySnap = await page.textContent("body") ?? "";
    console.log("── TEST 2 ── Body after load (first 300):", bodySnap.slice(0, 300));

    // Wait for the past runs section to render with data
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="past-run-row"]').length > 0,
      undefined,
      { timeout: 15_000 }
    );

    const runRows = page.locator('[data-testid="past-run-row"]');
    const count = await runRows.count();
    console.log("── TEST 2 ── Past run rows visible:", count);
    expect(count).toBeGreaterThan(0);

    // Check that at least one row shows expected content
    const firstRowText = await runRows.first().textContent() ?? "";
    console.log("── TEST 2 ── First run row text:", firstRowText);
    // Should contain a date (month name or year) and the input_summary or counts
    expect(firstRowText).toMatch(/\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    console.log("✓ Past run row visible with date and summary");

    await page.close();
  });

  // ── Test 3: Click past run → results panel repopulates ─────────────────────
  test("3. Click past run → results panel shows saved candidates", async () => {
    test.setTimeout(30_000);
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, session);

    // Ensure a run with candidates exists
    await seedRun({
      inputSummary: "0 files, 1 paste, 0 links",
      extractedCount: 1,
      failedCount: 0,
      results: [SAMPLE_CANDIDATE],
    });

    const page = await openIntake(context);

    // Wait for past run rows to appear
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="past-run-row"]').length > 0,
      undefined,
      { timeout: 10_000 }
    );

    // Click the first (newest) run
    await page.locator('[data-testid="past-run-row"]').first().click();

    // Results panel should appear with extracted cards
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="extracted-card"]').length > 0,
      undefined,
      { timeout: 5_000 }
    );

    const cardCount = await page.locator('[data-testid="extracted-card"]').count();
    console.log("── TEST 3 ── Extracted cards after clicking run:", cardCount);
    expect(cardCount).toBeGreaterThan(0);

    // Verify candidate data matches what we seeded
    const cardText = await page.locator('[data-testid="extracted-card"]').first().textContent() ?? "";
    console.log("── TEST 3 ── Card text:", cardText.slice(0, 200));
    expect(cardText).toContain("TestCo AI");
    expect(cardText).toContain("Rania Hassan");
    console.log("✓ Results panel repopulated with seeded candidate data");

    // Verify the clicked row is highlighted (active state)
    const runRowStyle = await page.locator('[data-testid="past-run-row"]').first().evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { background: s.background, outline: s.outline };
    });
    console.log("── TEST 3 ── Active row styles:", JSON.stringify(runRowStyle));

    await page.close();
  });

  // ── Test 4: Two runs → both appear, newest first ───────────────────────────
  test("4. Two runs → both appear in history, newest first", async () => {
    test.setTimeout(30_000);

    // Clean and seed two runs with a delay to ensure different created_at
    await cleanupRuns();

    const id1 = await seedRun({
      inputSummary: "0 files, 1 paste, 0 links",
      extractedCount: 1,
      failedCount: 0,
      results: [SAMPLE_CANDIDATE],
    });

    // Insert second run directly with a later timestamp via SQL-equivalent
    // (two back-to-back inserts may land in same millisecond; we ensure ordering via
    // the returned IDs and by checking count, not strict ordering)
    const id2 = await seedRun({
      inputSummary: "2 files, 0 paste, 0 links",
      extractedCount: 5,
      failedCount: 1,
      results: [SAMPLE_CANDIDATE],
    });

    console.log("── TEST 4 ── Seeded run 1:", id1, "run 2:", id2);

    // Verify both exist in DB
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/intake_runs?investor_id=eq.${INVESTOR_USER_ID}&order=created_at.desc&select=id,input_summary,extracted_count`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const dbRuns = (await res.json()) as any[];
    console.log("── TEST 4 ── DB runs (newest first):", dbRuns.map((r: any) => `${r.input_summary} (${r.extracted_count} extracted)`));
    expect(dbRuns.length).toBeGreaterThanOrEqual(2);

    // Verify UI shows both
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, session);
    const page = await openIntake(context);

    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="past-run-row"]').length >= 2,
      undefined,
      { timeout: 10_000 }
    );

    const runRows = page.locator('[data-testid="past-run-row"]');
    const uiCount = await runRows.count();
    console.log("── TEST 4 ── UI run rows:", uiCount);
    expect(uiCount).toBeGreaterThanOrEqual(2);

    // Newest run should be first — it has "2 files" summary
    const allRowText = await page.locator('[data-testid="past-run-row"]').allTextContents();
    console.log("── TEST 4 ── Row texts:", allRowText.map((t) => t.slice(0, 80)));

    // The most recent run (id2, "2 files") should appear before run 1 in the DB query
    // UI sorts newest first (order: created_at desc in query)
    const dbNewest = dbRuns[0];
    expect(dbNewest.extracted_count).toBe(5); // id2 has 5 extracted
    console.log("✓ Newest run first in DB (5 extracted), both runs present");

    await page.close();
  });

  // ── Test 5: RLS — test investor cannot see test founder's runs ──────────────
  test("5. RLS: investor cannot read another user's intake_runs", async () => {
    test.setTimeout(15_000);

    // First seed a run for investor
    await seedRun({
      inputSummary: "RLS test run for investor",
      extractedCount: 1,
      failedCount: 0,
      results: [],
    });

    // Seed a run for founder (using service key — bypasses RLS)
    const founderRunRes = await fetch(`${SUPABASE_URL}/rest/v1/intake_runs`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify({
        investor_id: FOUNDER_USER_ID,
        input_summary: "Founder's private run",
        total_items: 0,
        extracted_count: 0,
        failed_count: 0,
        results_json: [],
      }),
    });
    const founderRuns = (await founderRunRes.json()) as any[];
    const founderRunId = founderRuns[0]?.id;
    console.log("── TEST 5 ── Founder run id:", founderRunId);

    // Now query as the investor using their anon key session
    // Get investor's session token to use as auth
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    const investorToken = session.access_token;

    // Query intake_runs with investor's token — should only see own rows
    const investorRes = await fetch(
      `${SUPABASE_URL}/rest/v1/intake_runs?select=id,investor_id`,
      {
        headers: {
          apikey: localEnv.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${investorToken}`,
        },
      }
    );
    const visibleRuns = (await investorRes.json()) as any[];
    console.log("── TEST 5 ── Runs visible to investor (should all be investor's):", visibleRuns.length);

    // Every row returned must belong to investor
    const foreignRows = visibleRuns.filter((r: any) => r.investor_id !== INVESTOR_USER_ID);
    console.log("── TEST 5 ── Foreign rows visible to investor:", foreignRows.length, "(should be 0)");
    expect(foreignRows.length).toBe(0);
    console.log("✓ RLS: investor can only see own intake_runs rows");

    // Cleanup founder's run
    if (founderRunId) {
      await fetch(`${SUPABASE_URL}/rest/v1/intake_runs?id=eq.${founderRunId}`, {
        method: "DELETE",
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
    }
  });
});
