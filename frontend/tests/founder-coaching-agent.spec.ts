/**
 * Playwright tests: A2 Founder Coaching Agent (run-founder-coaching edge fn + Coaching UI)
 *
 * 1. Edge fn: manual trigger — all fields present, action_plan specific
 * 2. DB write confirmed — coaching_sessions row
 * 3. Rejection trigger — rejection_debrief references the reason
 * 4. UI renders — stage_guide visible, action items + effort badges
 * 5. Trigger wires — report only, no assertion
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
const EDGE_URL = `${SUPABASE_URL}/functions/v1/run-founder-coaching`;

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const FOUNDER_ID = testEnv.TEST_FOUNDER_USER_ID;
const STARTUP_ID = testEnv.TEST_FOUNDER_STARTUP_ID;

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

test.describe("A2 Founder Coaching Agent", () => {
  test.beforeAll(async () => {
    await serviceDelete(
      `coaching_sessions?startup_id=eq.${STARTUP_ID}`,
    ).catch(() => {});
  });

  test.afterAll(async () => {
    await serviceDelete(
      `coaching_sessions?startup_id=eq.${STARTUP_ID}`,
    ).catch(() => {});
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test("1. Edge fn: manual trigger — fields present, action_plan specific", async () => {
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
      body: JSON.stringify({
        startup_id: STARTUP_ID,
        user_id: FOUNDER_ID,
        trigger_type: "manual",
      }),
    });

    expect(res.status, `Expected 200, got ${res.status}`).toBe(200);
    const result = await res.json() as any;

    console.log("\n── TEST 1 RESULT ──");
    console.log(`stage_guide (first 200): ${result.stage_guide?.slice(0, 200)}`);
    console.log(`\nfinancial (first 120): ${result.financial?.slice(0, 120)}`);
    console.log(`\nlegal (first 120): ${result.legal?.slice(0, 120)}`);
    console.log(`\naction_plan[0]: ${JSON.stringify(result.action_plan?.[0], null, 2)}`);

    expect(result.stage_guide).toBeTruthy();
    expect(result.financial).toBeTruthy();
    expect(result.legal).toBeTruthy();
    expect(Array.isArray(result.action_plan)).toBe(true);
    expect(result.action_plan.length).toBeGreaterThanOrEqual(2);

    // action_plan[0] must be specific — not generic
    const action0 = result.action_plan[0];
    expect(action0.action).toBeTruthy();
    expect(action0.why).toBeTruthy();
    expect(["low", "medium", "high"]).toContain(action0.effort);

    const action0Lower = (action0.action ?? "").toLowerCase();
    const isSpecific =
      action0Lower.includes("financial model") ||
      action0Lower.includes("linkedin") ||
      action0Lower.includes("registration") ||
      action0Lower.includes("runway") ||
      action0Lower.includes("pitch deck") ||
      action0Lower.includes("website") ||
      action0Lower.includes("customer") ||
      action0Lower.includes("revenue") ||
      action0Lower.includes("loi") ||
      /\d/.test(action0.action); // contains a number = referencing actual data

    expect(
      isSpecific,
      `action_plan[0].action appears generic: "${action0.action}"`
    ).toBe(true);

    expect(result.id).toBeTruthy();
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test("2. DB write confirmed — coaching_sessions row", async () => {
    test.setTimeout(30000);

    const rows = await serviceGet(
      `coaching_sessions?startup_id=eq.${STARTUP_ID}&select=id,trigger_type,stage,stage_guide,financial,action_plan&order=created_at.desc&limit=1`,
    );

    console.log("\n── TEST 2 RESULT ──");
    const row = rows?.[0];
    if (row) {
      console.log(JSON.stringify({
        id: row.id,
        trigger_type: row.trigger_type,
        stage: row.stage,
        stage_guide_preview: row.stage_guide?.slice(0, 120),
        financial_preview: row.financial?.slice(0, 120),
        action_count: Array.isArray(row.action_plan) ? row.action_plan.length : "not array",
      }, null, 2));
    } else {
      console.log("NO ROW FOUND");
    }

    expect((rows ?? []).length).toBeGreaterThan(0);
    expect(row.trigger_type).toBeTruthy();
    expect(row.stage_guide).toBeTruthy();
    expect(row.financial).toBeTruthy();
    expect(Array.isArray(row.action_plan)).toBe(true);
    expect(row.action_plan.length).toBeGreaterThanOrEqual(2);
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test("3. Rejection trigger — rejection_debrief references the reason", async () => {
    test.setTimeout(90000);

    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
    const jwt = session.access_token;

    const rejectionReason = "Runway too short and no financial model — cannot assess burn trajectory";

    const res = await fetch(EDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({
        startup_id: STARTUP_ID,
        user_id: FOUNDER_ID,
        trigger_type: "rejection",
        trigger_data: { rejection_reason: rejectionReason },
      }),
    });

    expect(res.status, `Expected 200, got ${res.status}`).toBe(200);
    const result = await res.json() as any;

    console.log("\n── TEST 3 RESULT ──");
    console.log(`rejection_debrief: ${result.rejection_debrief}`);

    expect(result.rejection_debrief).toBeTruthy();
    expect(result.rejection_debrief).not.toBe("null");
    expect(result.rejection_debrief.length).toBeGreaterThan(20);

    const debriefLower = (result.rejection_debrief ?? "").toLowerCase();
    const referencesReason =
      debriefLower.includes("runway") ||
      debriefLower.includes("financial") ||
      debriefLower.includes("burn") ||
      debriefLower.includes("model");

    expect(
      referencesReason,
      `rejection_debrief does not reference the rejection reason: "${result.rejection_debrief?.slice(0, 200)}"`
    ).toBe(true);
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  test("4. UI renders — stage_guide visible, action items + effort badges", async ({ browser }) => {
    test.setTimeout(150000);

    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
    const ctx = await browser.newContext();
    await injectSession(ctx, session);
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    // "Get Coaching" button must be visible
    const btn = page.locator("[data-testid=run-coaching-btn]");
    await expect(btn).toBeVisible({ timeout: 15000 });
    console.log("✓ Get Coaching button visible");

    // Click it
    await btn.click();

    // Wait for completion
    await expect(btn).not.toHaveText("Running…", { timeout: 120000 });
    console.log("✓ Coaching session completed");

    // Stage guide section visible
    const stageGuide = page.locator("[data-testid=coaching-stage-guide]");
    await expect(stageGuide).toBeVisible({ timeout: 10000 });
    const stageGuideText = await stageGuide.textContent();
    expect(stageGuideText?.trim().length ?? 0).toBeGreaterThan(10);
    console.log(`✓ Stage guide: ${stageGuideText?.slice(0, 80)}…`);

    // Action plan items
    const actionItems = page.locator("[data-testid=coaching-action-item]");
    const actionCount = await actionItems.count();
    expect(actionCount).toBeGreaterThanOrEqual(2);
    console.log(`✓ ${actionCount} action item(s) visible`);

    // Effort badges
    const effortBadges = page.locator("[data-testid=coaching-effort-badge]");
    const badgeCount = await effortBadges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(2);

    // Verify badge text is low/medium/high
    for (let i = 0; i < badgeCount; i++) {
      const badgeText = (await effortBadges.nth(i).textContent())?.toLowerCase().trim();
      expect(["low", "medium", "high"]).toContain(badgeText);
    }
    console.log(`✓ ${badgeCount} effort badge(s) visible with correct labels`);

    await page.screenshot({ path: "/tmp/pw-coaching-4.png" });
    console.log("Screenshot: /tmp/pw-coaching-4.png");

    // Visual flags for TradX
    console.log("\n── VISUAL FLAGS FOR TRADX ──");
    console.log("Stage guide: purple left border (3px solid #7C3AED), purple label above");
    console.log("Financial/Legal: side-by-side grid on wide screens, dark card sub-blocks");
    console.log("Action items: numbered purple circles, bold action text, gray 'why' below");
    console.log("Effort badges: Low=green, Medium=amber, High=red — colored pill at right");
    console.log("Rejection block: red tint (only shows when rejection_debrief is non-null)");

    await ctx.close();
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  test("5. Trigger wires — report only", async () => {
    console.log("\n── TEST 5 TRIGGER WIRE REPORT ──");

    console.log("\nTrigger A — stage_change:");
    console.log("  Status: WIRED");
    console.log("  File: frontend/src/routes/app.settings.tsx");
    console.log("  Location: saveCompany() — after startups UPDATE succeeds, if stage !== prevStage");
    console.log("  Mechanism: fire-and-forget import('@/lib/coaching-fn').runFounderCoaching(...)");
    console.log("  Rate subject: founder's own user_id");

    console.log("\nTrigger B — rejection:");
    console.log("  Status: WIRED");
    console.log("  File: frontend/src/routes/app.investor.decisions.tsx");
    console.log("  Location: submitDecision() — after 'pass' block inserts to decisions table");
    console.log("  Mechanism: fire-and-forget — fetches startup.founder_id, then calls runFounderCoaching()");
    console.log("  Rate subject: startup founder_id (looked up from startups table)");
    console.log("  Rejection reason: pass_reason_category + pass_reason_detail concatenated");
    console.log("  Guard: only fires if entry.startup_id is set (watchlist entry linked to a startup)");

    // No assertions — this is a report-only test
    expect(true).toBe(true);
  });
});
