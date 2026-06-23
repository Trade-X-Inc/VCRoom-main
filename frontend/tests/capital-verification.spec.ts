/**
 * Playwright tests: Capital Verification — Tier 3
 * /app/investor/profile → Capital Verified — Tier 3 section
 *
 * Test-investor: 920727d9-77fa-4ecc-a3e4-467e04a0bb38
 *
 * Tests:
 *   1. All 3 upload slots visible with correct labels
 *   2. Upload a real minimal PDF to slot 1 (fund formation) — AI check runs
 *   3. investor_verifications row has ai_extracted content for fund_formation slot
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

const SUPABASE_URL   = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY    = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY    = "sb-ldimninnjlvxozubheib-auth-token";
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS  = testEnv.TEST_INVESTOR_PASSWORD;
const INVESTOR_ID    = testEnv.TEST_INVESTOR_USER_ID;

const PAGE_URL = "https://hockystick.app/app/investor/profile";

async function serviceGet(p: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return r.json() as Promise<any[]>;
}

async function servicePatch(p: string, body: Record<string, any>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
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

// Create a minimal but valid PDF in memory (contains real text pdfjs can extract)
function makeTestPdf(content: string): Buffer {
  const body = [
    "%PDF-1.4",
    "1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj",
    "2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj",
    "3 0 obj<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>endobj",
  ];
  const stream = `BT /F1 12 Tf 50 700 Td (${content.replace(/[()\\]/g, "\\$&")}) Tj ET`;
  body.push(`4 0 obj<</Length ${stream.length}>>\nstream\n${stream}\nendstream\nendobj`);
  body.push("5 0 obj<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>endobj");
  const xrefOffset = body.join("\n").length + 1;
  body.push("xref");
  body.push("0 6");
  body.push("0000000000 65535 f");
  // Simplified: just use dummy offsets for xref (PDF readers are lenient for basic text extraction)
  for (let i = 1; i <= 5; i++) body.push(`0000000${String(i * 100).padStart(6, "0")} 00000 n`);
  body.push("trailer<</Size 6 /Root 1 0 R>>");
  body.push(`startxref\n${xrefOffset}`);
  body.push("%%EOF");
  return Buffer.from(body.join("\n"));
}

test.describe("Capital Verification — Tier 3", () => {

  test.beforeAll(async () => {
    // Reset fund_formation slot for test-investor so test is repeatable
    await servicePatch(
      `investor_verifications?investor_id=eq.${INVESTOR_ID}`,
      {
        fund_formation_doc_path: null,
        fund_formation_doc_uploaded_at: null,
        fund_formation_ai_extracted: null,
        fund_formation_verified: null,
      }
    );
  });

  test("1. All 3 upload slots render with correct labels", async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
    const page = await ctx.newPage();

    await page.goto(PAGE_URL, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !document.body.textContent?.includes("Loading…"), { timeout: 20000 });
    await page.screenshot({ path: "/tmp/pw-capverif-1-before-open.png" });

    // The accordion section must be present
    const section = page.locator("[data-testid=capital-verification-section]");
    await expect(section).toBeVisible({ timeout: 15000 });

    // Open accordion
    await section.locator("button").first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "/tmp/pw-capverif-1-open.png" });

    // All 3 slots visible
    await expect(page.locator("[data-testid=capital-slot-fund-formation]")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("[data-testid=capital-slot-capital-commitment]")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("[data-testid=capital-slot-aum-confirmation]")).toBeVisible({ timeout: 5000 });

    // Correct title text
    await expect(page.locator("text=Fund formation document")).toBeVisible();
    await expect(page.locator("text=Capital commitment letter / board resolution")).toBeVisible();
    await expect(page.locator("text=AUM confirmation")).toBeVisible();

    // Requirement copy present for each slot (scoped to the slot card)
    await expect(page.locator("[data-testid=capital-slot-fund-formation]").locator("text=/Limited Partnership Agreement/")).toBeVisible();
    await expect(page.locator("[data-testid=capital-slot-capital-commitment]").locator("text=/committed capital amount/")).toBeVisible();
    await expect(page.locator("[data-testid=capital-slot-aum-confirmation]").locator("text=/12 months/")).toBeVisible();

    console.log("✓ All 3 slots visible with correct labels and requirement copy");
    await ctx.close();
  });

  test("2. Upload test PDF to slot 1 — AI check runs and returns a result", async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
    const page = await ctx.newPage();

    await page.goto(PAGE_URL, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !document.body.textContent?.includes("Loading…"), { timeout: 20000 });

    const section = page.locator("[data-testid=capital-verification-section]");
    await expect(section).toBeVisible({ timeout: 15000 });
    await section.locator("button").first().click();
    await page.waitForTimeout(400);

    // Write test PDF to tmp
    const pdfContent = "Test Ventures LP Agreement - General Partner: Test Ventures GP LLC - This Limited Partnership Agreement establishes Test Ventures Fund I LP.";
    const pdfBuffer = makeTestPdf(pdfContent);
    const pdfPath = path.join("/tmp", "test-fund-formation.pdf");
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Set the file input for slot 1
    const slot1 = page.locator("[data-testid=capital-slot-fund-formation]");
    const fileInput = slot1.locator("input[type=file]");
    await fileInput.setInputFiles(pdfPath);

    // Confirm dialog appears
    await expect(slot1.locator("[data-testid=capital-slot-fund-formation-confirm]")).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "/tmp/pw-capverif-2-confirm.png" });

    // Click confirm
    await slot1.locator("[data-testid=capital-slot-fund-formation-confirm]").click();

    // Wait for upload + AI (up to 40s)
    // Either a toast appears or the slot status changes
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "/tmp/pw-capverif-2-during.png" });

    // Wait for spinner to disappear (upload complete)
    await page.waitForFunction(
      () => !document.querySelector("[data-testid=capital-slot-fund-formation] label")?.textContent?.includes("Checking"),
      { timeout: 45000 }
    );

    await page.screenshot({ path: "/tmp/pw-capverif-2-done.png" });
    console.log("✓ AI check completed (pass or fail — flow ran)");
    await ctx.close();
  });

  test("3. investor_verifications row has ai_extracted content for fund_formation", async () => {
    // Poll DB for up to 15s — server fn write is async after the browser test completes
    let rows: any[] = [];
    for (let i = 0; i < 10; i++) {
      rows = await serviceGet(
        `investor_verifications?investor_id=eq.${INVESTOR_ID}&select=fund_formation_doc_path,fund_formation_doc_uploaded_at,fund_formation_ai_extracted,fund_formation_verified`
      );
      if (rows.length > 0 && rows[0].fund_formation_ai_extracted) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    console.log("investor_verifications row:", JSON.stringify(rows[0], null, 2));

    expect(rows.length).toBeGreaterThan(0);

    const row = rows[0];
    // doc_path must be set
    expect(row.fund_formation_doc_path).toBeTruthy();
    expect(row.fund_formation_doc_path).toMatch(/verification-docs/);

    // ai_extracted must be a real object with the expected fields
    expect(row.fund_formation_ai_extracted).toBeTruthy();
    expect(typeof row.fund_formation_ai_extracted).toBe("object");
    expect(row.fund_formation_ai_extracted).toHaveProperty("confirmed");
    expect(row.fund_formation_ai_extracted).toHaveProperty("confidence");
    expect(row.fund_formation_ai_extracted).toHaveProperty("explanation");

    // verified is boolean (true or false — either is OK, test is that AI ran)
    expect(typeof row.fund_formation_verified).toBe("boolean");

    console.log("✓ ai_extracted has real content:", JSON.stringify(row.fund_formation_ai_extracted));
  });

});
