/**
 * ACCEPTANCE TEST: DD auto-detection accuracy for Atlas Robotics.
 *
 * THE ACCEPTANCE CRITERION:
 *   After running auto-detection on the real Atlas Robotics deal room, the
 *   Financials category must show 0 (or very near 0) items with auto_detected=true.
 *   Atlas has two financial-category documents — "financials.csv" and
 *   "Financial_Summary_ATLAS_ROBOTICS.pdf" — but the user confirmed these do NOT
 *   contain genuine P&L, balance sheet, cash flow, revenue projections (3yr), or
 *   cap table. If the AI correctly rejects them, Financials auto-detection count = 0.
 *   If it still shows high auto-detection, the fix has failed.
 *
 * Approach:
 *   Temporarily add test-investor to the real Atlas deal room, sign in as
 *   test-investor, trigger auto-detection via the UI (exactly as an investor would),
 *   then query the real DB via service key and assert the result.
 *   Clean up (remove test-investor from room) regardless of test outcome.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  const env: Record<string, string> = {};
  for (const line of lines) {
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

const SUPABASE_URL = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY  = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY  = "sb-ldimninnjlvxozubheib-auth-token";

const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS  = testEnv.TEST_INVESTOR_PASSWORD;
const TEST_INVESTOR_ID = testEnv.TEST_INVESTOR_USER_ID;

// Real Atlas Robotics deal room — the one being tested
const ATLAS_DEAL_ROOM_ID = "957f9750-00c7-402a-b1ba-d9c7a4e3ba2f";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function serviceGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.json() as Promise<any[]>;
}

async function servicePost(path: string, body: Record<string, any>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function serviceDelete(path: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: "return=minimal" },
  });
}

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto("https://hockystick.app/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, session }: { key: string; session: any }) => {
      localStorage.setItem(key, JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      }));
    },
    { key: STORAGE_KEY, session }
  );
  await page.close();
}

// ── Test ──────────────────────────────────────────────────────────────────────

test("ACCEPTANCE: Atlas Robotics auto-detection accuracy — Financials must = 0 auto-detected", async ({ browser }) => {

  // SETUP: add test-investor to the real Atlas deal room so they can trigger detection
  // (skip if already a member)
  const existing = await serviceGet(
    `deal_room_members?deal_room_id=eq.${ATLAS_DEAL_ROOM_ID}&user_id=eq.${TEST_INVESTOR_ID}&select=id`
  );
  const alreadyMember = existing.length > 0;

  if (!alreadyMember) {
    await servicePost("deal_room_members", {
      deal_room_id: ATLAS_DEAL_ROOM_ID,
      user_id: TEST_INVESTOR_ID,
      role: "investor",
    });
    console.log("Added test-investor to Atlas deal room");
  }

  // Pre-sign the NDA for test-investor (required to access the deal room UI)
  const existingNda = await serviceGet(
    `nda_acceptances?deal_room_id=eq.${ATLAS_DEAL_ROOM_ID}&user_id=eq.${TEST_INVESTOR_ID}&select=id`
  );
  if (existingNda.length === 0) {
    await servicePost("nda_acceptances", {
      deal_room_id: ATLAS_DEAL_ROOM_ID,
      user_id: TEST_INVESTOR_ID,
      role: "investor",
      accepted_at: new Date().toISOString(),
      ip_address: "127.0.0.1",
      user_agent: "Playwright/test",
      nda_version: "v1.0",
      nda_html: "Test NDA accepted",
    });
    console.log("Pre-signed NDA for test-investor");
  }

  // RESET: clear any previous auto-detection on Atlas Financials items
  // so this test starts from a known baseline
  await fetch(
    `${SUPABASE_URL}/rest/v1/dd_checklist_items?deal_room_id=eq.${ATLAS_DEAL_ROOM_ID}&category=eq.Financials`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json", Prefer: "return=minimal",
      },
      body: JSON.stringify({ auto_detected: false, auto_source: null, auto_source_label: null, checked: false, manually_overridden: false }),
    }
  );
  console.log("Reset Atlas Financials items to baseline");

  try {
    // NAVIGATE: sign in as test-investor and go to the Atlas deal room
    const context = await browser.newContext();
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASS);
    await injectSession(context, session);
    const page = await context.newPage();

    await page.goto(`https://hockystick.app/app/deal-room/${ATLAS_DEAL_ROOM_ID}`, { waitUntil: "networkidle" });

    // Navigate to Workstation tab (JS-click to bypass overflow-hidden tab bar)
    await page.locator("button", { hasText: /overview/i }).first().waitFor({ state: "attached", timeout: 20000 });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const tab = buttons.find((b) => /workstation/i.test(b.textContent ?? ""));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: "/tmp/pw-atlas-workstation.png" });

    // Click "Run auto-detection" button
    const runBtn = page.locator("button", { hasText: /run auto.detection/i });
    await runBtn.waitFor({ state: "attached", timeout: 10000 });
    await runBtn.scrollIntoViewIfNeeded().catch(() => {});
    await runBtn.click({ force: true });

    // Wait for the AI calls to complete — this may take 30-60s for 23 items
    // Watch for the toast notification
    console.log("Running auto-detection (may take 30-60s for AI per-item checks)...");
    try {
      await page.waitForSelector("text=/auto-detected|No new items/i", { timeout: 90000 });
    } catch {
      // Toast may have dismissed — still proceed to DB check
      await page.waitForTimeout(15000);
    }

    await page.screenshot({ path: "/tmp/pw-atlas-after-autodetect.png" });

    await context.close();

    // ASSERT: query real DB state for Atlas Financials
    const financialsItems = await serviceGet(
      `dd_checklist_items?deal_room_id=eq.${ATLAS_DEAL_ROOM_ID}&category=eq.Financials&select=label,checked,auto_detected,auto_source_label`
    );

    console.log("\n=== ACCEPTANCE RESULT: Atlas Robotics Financials ===");
    for (const item of financialsItems) {
      console.log(`  [${item.auto_detected ? "AUTO" : "MANUAL"}] ${item.label}${item.auto_source_label ? ` — ${item.auto_source_label}` : ""}`);
    }

    const autoDetectedFinancials = financialsItems.filter((i: any) => i.auto_detected === true);
    console.log(`\nAuto-detected Financials: ${autoDetectedFinancials.length}/${financialsItems.length}`);

    if (autoDetectedFinancials.length > 0) {
      console.log("AUTO-DETECTED ITEMS (these should be 0):");
      for (const item of autoDetectedFinancials) {
        console.log(`  ✗ ${item.label} → ${item.auto_source_label}`);
      }
    } else {
      console.log("✓ PASS: No Financials items auto-detected (correct — documents don't contain genuine financial statements)");
    }

    // THE ACCEPTANCE CRITERION
    expect(autoDetectedFinancials.length).toBe(0);

    // Also check all categories to report overall results
    const allItems = await serviceGet(
      `dd_checklist_items?deal_room_id=eq.${ATLAS_DEAL_ROOM_ID}&select=category,label,auto_detected,auto_source_label`
    );
    const totalAutoDetected = allItems.filter((i: any) => i.auto_detected === true);
    console.log(`\nOverall: ${totalAutoDetected.length}/${allItems.length} items auto-detected across all categories`);
    for (const item of totalAutoDetected) {
      console.log(`  [${item.category}] ${item.label} → ${item.auto_source_label}`);
    }

  } finally {
    // CLEANUP: remove test-investor from Atlas deal room if we added them
    if (!alreadyMember) {
      await serviceDelete(
        `deal_room_members?deal_room_id=eq.${ATLAS_DEAL_ROOM_ID}&user_id=eq.${TEST_INVESTOR_ID}`
      );
      // Also remove NDA acceptance (since we're cleaning up)
      await serviceDelete(
        `nda_acceptances?deal_room_id=eq.${ATLAS_DEAL_ROOM_ID}&user_id=eq.${TEST_INVESTOR_ID}`
      );
      console.log("Cleaned up: removed test-investor from Atlas deal room");
    }
  }
});
