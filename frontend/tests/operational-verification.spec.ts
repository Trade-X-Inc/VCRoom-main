/**
 * Playwright tests: Operational Verification — Tier 3 (founder side)
 * Also verifies: actionable hint renders for investor's existing rejected slot.
 *
 * Tests:
 *   1. Actionable hint ("What's missing:") renders on investor profile for test-investor's
 *      existing rejected fund_formation slot (requires ai_extracted to be present in DB).
 *   2. Founder Tier 3: 3 operational slots visible on test-founder's /app/profile.
 */

import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

function loadEnv(p: string): Record<string, string> {
  const e: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    e[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return e;
}

const testEnv  = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL    = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY     = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY     = "sb-ldimninnjlvxozubheib-auth-token";
const INVESTOR_EMAIL  = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS   = testEnv.TEST_INVESTOR_PASSWORD;
const INVESTOR_ID     = testEnv.TEST_INVESTOR_USER_ID;
const FOUNDER_EMAIL   = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS    = testEnv.TEST_FOUNDER_PASSWORD;

const INVESTOR_PROFILE_URL = "https://hockystick.app/app/investor/profile";
const FOUNDER_PROFILE_URL  = "https://hockystick.app/app/profile";

async function serviceGet(p: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return r.json() as Promise<any[]>;
}

async function servicePatch(p: string, body: Record<string, any>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${p} failed: ${r.status} ${await r.text()}`);
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

// ── Test 1: Actionable hint renders for investor's existing rejected slot ─────

test("1. Actionable hint renders for investor's rejected fund_formation slot", async ({ browser }) => {
  // First ensure a rejected slot exists in DB (seed if needed)
  const rows = await serviceGet(
    `investor_verifications?investor_id=eq.${INVESTOR_ID}&select=fund_formation_doc_path,fund_formation_ai_extracted,fund_formation_verified`
  );
  const row = rows?.[0];

  if (!row || !row.fund_formation_ai_extracted) {
    // Seed a rejected result so the hint has content to show
    await servicePatch(
      `investor_verifications?investor_id=eq.${INVESTOR_ID}`,
      {
        fund_formation_doc_path: "verification-docs/test-seeded/capital/fund_formation_test.pdf",
        fund_formation_doc_uploaded_at: new Date().toISOString(),
        fund_formation_ai_extracted: {
          confirmed: false,
          confidence: "low",
          explanation: "The document does not clearly identify a signing party with authority. A General Partner or Director signature block is required.",
          issues: "No signing party with apparent authority (General Partner, Director, or equivalent) was identified.",
        },
        fund_formation_verified: false,
        updated_at: new Date().toISOString(),
      }
    );
    console.log("Seeded rejected fund_formation slot for test-investor.");
  }

  const ctx = await browser.newContext();
  await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
  const page = await ctx.newPage();

  await page.goto(INVESTOR_PROFILE_URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.body.textContent?.includes("Loading…"), { timeout: 20000 });

  const section = page.locator("[data-testid=capital-verification-section]");
  await expect(section).toBeVisible({ timeout: 15000 });

  // Open accordion
  await section.locator("button").first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/pw-opverif-1-accordion.png" });

  // The hint should appear on the rejected slot
  const hint = page.locator("[data-testid=capital-slot-fund-formation-hint]");
  await expect(hint).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: "/tmp/pw-opverif-1-hint.png" });

  // "What's missing" label visible
  await expect(hint.locator("text=What's missing")).toBeVisible();

  // The hint container itself contains "signing party" somewhere
  const hintText = await hint.textContent();
  expect(hintText).toContain("signing party");

  // The issues text element (amber) is specifically visible
  const issueText = page.locator("[data-testid=capital-slot-fund-formation-issue-text]");
  await expect(issueText).toBeVisible({ timeout: 5000 });
  const issueContent = await issueText.textContent();
  expect(issueContent).toContain("signing party");

  console.log("✓ Actionable hint renders with explanation:", issueContent);
  await ctx.close();
});

// ── Test 2: Founder Tier 3 slots visible on /app/profile ──────────────────────

test("2. Founder Tier 3 — 3 operational slots visible on Company Profile", async ({ browser }) => {
  const ctx = await browser.newContext();
  await injectSession(ctx, await getSession(FOUNDER_EMAIL, FOUNDER_PASS));
  const page = await ctx.newPage();

  await page.goto(FOUNDER_PROFILE_URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.body.textContent?.includes("Loading…"), { timeout: 20000 });
  await page.screenshot({ path: "/tmp/pw-opverif-2-profile.png" });

  // The section must be visible
  const section = page.locator("[data-testid=op-verification-section]");
  await expect(section).toBeVisible({ timeout: 15000 });

  // Header text
  await expect(section.locator("text=Operationally Verified — Tier 3")).toBeVisible();

  // Open accordion
  await section.locator("button").first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/pw-opverif-2-open.png" });

  // All 3 slot cards visible
  await expect(page.locator("[data-testid=op-slot-bank]")).toBeVisible({ timeout: 8000 });
  await expect(page.locator("[data-testid=op-slot-contract]")).toBeVisible({ timeout: 8000 });
  await expect(page.locator("[data-testid=op-slot-team]")).toBeVisible({ timeout: 8000 });

  // Correct labels
  await expect(page.locator("text=Bank or revenue statement")).toBeVisible();
  await expect(page.locator("text=Customer or contract evidence")).toBeVisible();
  await expect(page.locator("text=Payroll or employment document")).toBeVisible();

  // Upload buttons present for each slot
  await expect(page.locator("[data-testid=op-slot-bank-upload]")).toBeVisible();
  await expect(page.locator("[data-testid=op-slot-contract-upload]")).toBeVisible();
  await expect(page.locator("[data-testid=op-slot-team-upload]")).toBeVisible();

  // Stepper visible
  await expect(page.locator("[data-testid=op-stepper]")).toBeVisible();

  console.log("✓ All 3 operational slots visible with correct labels and upload buttons");
  await ctx.close();
});
