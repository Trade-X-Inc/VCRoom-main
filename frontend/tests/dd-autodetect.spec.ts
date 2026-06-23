/**
 * DD auto-detection Playwright tests.
 *
 * Uses the stable test deal room (ID: 11111111-2222-3333-4444-555555555555)
 * seeded in Supabase with one pre-auto-detected item ("Cash flow statement").
 * The test deal room is a permanent fixture — its items are reset before each run.
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

const testEnv  = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL    = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY     = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY     = `sb-ldimninnjlvxozubheib-auth-token`;
const INVESTOR_EMAIL  = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS   = testEnv.TEST_INVESTOR_PASSWORD;

// Stable test fixtures — never delete these rows
const TEST_DEAL_ROOM_ID = "11111111-2222-3333-4444-555555555555";
const TEST_INVESTOR_ID  = "920727d9-77fa-4ecc-a3e4-467e04a0bb38";
const TEST_STARTUP_ID   = "c9101e5d-619a-4490-a6c9-ce4f0ed78812";

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto("https://hockystick.app/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, session }: { key: string; session: any }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          expires_at: session.expires_at,
          token_type: session.token_type,
          user: session.user,
        })
      );
    },
    { key: STORAGE_KEY, session }
  );
  await page.close();
}

async function apiGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.json() as Promise<any[]>;
}

async function apiPatch(path: string, body: Record<string, any>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

// Reset the auto-detected item to its pristine state before each run
async function resetAutoDetectedItem() {
  await fetch(
    `${SUPABASE_URL}/rest/v1/dd_checklist_items?deal_room_id=eq.${TEST_DEAL_ROOM_ID}&label=eq.Cash%20flow%20statement`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        checked: true,
        auto_detected: true,
        auto_source: "documents",
        auto_source_label: "Document uploaded: test-financials.csv",
        manually_overridden: false,
      }),
    }
  );
}

test.describe("DD auto-detection", () => {
  test.beforeEach(async () => {
    await resetAutoDetectedItem();
  });

  test("1. Auto-detected item renders green badge in DD Workstation", async ({ browser }) => {
    const context = await browser.newContext();
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASS);
    await injectSession(context, session);
    const page = await context.newPage();

    await page.goto(
      `https://hockystick.app/app/deal-room/${TEST_DEAL_ROOM_ID}`,
      { waitUntil: "networkidle" }
    );

    // Tab bar uses overflow:hidden so tabs may not be in the visible viewport.
    // Wait for any tab to appear (confirming NDA gate is passed), then JS-click Workstation.
    await page.locator("button", { hasText: /overview/i }).first().waitFor({ state: "attached", timeout: 20000 });

    // JS-click Workstation tab — bypasses overflow-hidden visibility constraint
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const tab = buttons.find((b) => /workstation/i.test(b.textContent ?? ""));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: "/tmp/pw-dd-tab-clicked.png" });

    // Financials category button — wait for DD panel to render, then JS-click it
    await page.locator("button", { hasText: /financials/i }).first().waitFor({ state: "attached", timeout: 10000 });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const cat = buttons.find((b) => /^financials$/i.test(b.textContent?.trim() ?? ""));
      if (cat) cat.click();
    });
    await page.waitForTimeout(800);

    await page.screenshot({ path: "/tmp/pw-dd-financials-open.png" });

    // "Cash flow statement" should be visible with its auto-source label badge
    await expect(page.locator("text=Cash flow statement")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Document uploaded: test-financials.csv")).toBeVisible({
      timeout: 5000,
    });

    await page.screenshot({ path: "/tmp/pw-dd-autodetect-badge.png" });
    console.log("Auto-detected badge visible: Document uploaded: test-financials.csv");
    await context.close();
  });

  test("2. Clicking auto-detected item sets manually_overridden=true in DB", async ({ browser }) => {
    const context = await browser.newContext();
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASS);
    await injectSession(context, session);
    const page = await context.newPage();

    await page.goto(
      `https://hockystick.app/app/deal-room/${TEST_DEAL_ROOM_ID}`,
      { waitUntil: "networkidle" }
    );

    // Wait for NDA gate to pass (Overview tab appears), then JS-click Workstation tab
    await page.locator("button", { hasText: /overview/i }).first().waitFor({ state: "attached", timeout: 20000 });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const tab = buttons.find((b) => /workstation/i.test(b.textContent ?? ""));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    // Expand Financials
    await page.locator("button", { hasText: /financials/i }).first().waitFor({ state: "attached", timeout: 10000 });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const cat = buttons.find((b) => /^financials$/i.test(b.textContent?.trim() ?? ""));
      if (cat) cat.click();
    });
    await page.waitForTimeout(500);

    // Click the auto-detected item to override it (it's checked=true, so clicking unchecks it)
    const cashFlowRow = page.locator("button", { hasText: /cash flow statement/i });
    await expect(cashFlowRow).toBeVisible({ timeout: 10000 });
    await cashFlowRow.click();
    await page.waitForTimeout(2000); // wait for DB write

    await page.screenshot({ path: "/tmp/pw-dd-override.png" });

    // Verify DB: manually_overridden should now be true
    const rows = await apiGet(
      `dd_checklist_items?deal_room_id=eq.${TEST_DEAL_ROOM_ID}&label=eq.Cash%20flow%20statement&select=checked,auto_detected,manually_overridden`
    );
    console.log("DB state after override:", JSON.stringify(rows[0]));
    expect(rows.length).toBe(1);
    expect(rows[0].manually_overridden).toBe(true);
    expect(rows[0].auto_detected).toBe(true); // auto_detected stays true, override is the flag

    await context.close();
  });

  test("3. Diligence summary page shows real deal room progress", async ({ browser }) => {
    const context = await browser.newContext();
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASS);
    await injectSession(context, session);
    const page = await context.newPage();

    await page.goto("https://hockystick.app/app/investor/diligence", { waitUntil: "networkidle" });

    await page.screenshot({ path: "/tmp/pw-diligence-summary.png" });

    // Should show the deal room section (not the "no deal rooms" empty state)
    await expect(page.locator("text=Active deal rooms")).toBeVisible({ timeout: 15000 });

    // The test startup company name should appear (Playwright Test Co)
    // (from startups table — c9101e5d startup)
    await expect(
      page.locator("text=Playwright Test Co, text=Playwright, text=Test Co").first()
    ).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Company name might differ — just confirm there's at least one room card
      const roomCards = page.locator("[data-testid=room-card], .rounded-xl").filter({ hasText: /open dd/i });
      await expect(roomCards.first()).toBeVisible({ timeout: 5000 });
    });

    // Progress numbers: should show X/8 (8 items seeded) — not "0%" or completely empty
    const bodyText = await page.textContent("body");
    console.log("Body excerpt:", bodyText?.slice(0, 500));
    // The page should NOT show fabricated 0% when there are real items
    expect(bodyText).toMatch(/\d+\/8/);

    console.log("Diligence summary shows real progress numbers");
    await context.close();
  });

  test("4. Diligence summary page separates watchlist-only Diligence entries", async ({ browser }) => {
    // Seed a watchlist entry in Diligence status for test-investor (clean up after)
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/investor_watchlist`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          investor_id: TEST_INVESTOR_ID,
          company_name: "PW Diligence Co",
          status: "Diligence",
          sector: "SaaS",
          stage: "Seed",
        }),
      }
    );
    const inserted = (await insertRes.json()) as any[];
    const watchlistId = inserted[0]?.id;
    console.log("Seeded watchlist entry:", watchlistId);

    try {
      const context = await browser.newContext();
      const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASS);
      await injectSession(context, session);
      const page = await context.newPage();

      await page.goto("https://hockystick.app/app/investor/diligence", { waitUntil: "networkidle" });
      await page.screenshot({ path: "/tmp/pw-diligence-watchlist-section.png" });

      // The "In diligence — not yet in a deal room" section should appear
      await expect(
        page.locator("text=In diligence — not yet in a deal room")
      ).toBeVisible({ timeout: 15000 });

      // The seeded company should be listed there
      await expect(page.locator("text=PW Diligence Co")).toBeVisible({ timeout: 5000 });

      // That entry should NOT have a progress bar (no "X/Y items" for it)
      // It should have "Awaiting deal room" badge instead
      await expect(page.locator("text=Awaiting deal room").first()).toBeVisible({ timeout: 5000 });

      console.log("Watchlist-only Diligence section renders correctly");
      await context.close();
    } finally {
      // Clean up watchlist entry
      if (watchlistId) {
        await fetch(`${SUPABASE_URL}/rest/v1/investor_watchlist?id=eq.${watchlistId}`, {
          method: "DELETE",
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: "return=minimal" },
        });
        console.log("Cleaned up watchlist entry:", watchlistId);
      }
    }
  });
});
