import { test, expect, type BrowserContext, type Page } from "@playwright/test";
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
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = `sb-ldimninnjlvxozubheib-auth-token`;
const APP_URL = process.env.R12_TEST_BASE_URL || "https://hockystick.app";

const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASSWORD = testEnv.TEST_INVESTOR_PASSWORD;
const ASSOCIATE_EMAIL = testEnv.TEST_INVESTOR_MEMBER_EMAIL;
const ASSOCIATE_PASSWORD = testEnv.TEST_INVESTOR_MEMBER_PASSWORD;

const PROFILE_URL = `${APP_URL}/app/investor/thesis/profile-builder/full-profile`;

function adminHeaders() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
}

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: adminHeaders(), body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, session }: { key: string; session: any }) => {
      localStorage.setItem(key, JSON.stringify({
        access_token: session.access_token, refresh_token: session.refresh_token,
        expires_in: session.expires_in, expires_at: session.expires_at,
        token_type: session.token_type, user: session.user,
      }));
    },
    { key: STORAGE_KEY, session },
  );
  return page;
}

// R12C VERIFY — Associate edits a field, sees "Awaiting approval" inline,
// the field does NOT change on the live profile; Owner sees it queued,
// approves; field goes live and the Associate's still-open session
// reflects it in real time (R12B), no reload.
test("Associate edit -> Owner approves -> live everywhere, no reload", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  // Clean slate: remove any leftover pending changes from prior runs.
  await request.delete(`${SUPABASE_URL}/rest/v1/investor_profile_pending_changes?proposed_by=eq.${testEnv.TEST_INVESTOR_MEMBER_USER_ID}`, { headers: adminHeaders() });

  const associateContext = await browser.newContext();
  const associateSession = await getSession(ASSOCIATE_EMAIL, ASSOCIATE_PASSWORD);
  const associatePage = await injectSession(associateContext, associateSession);

  const ownerContext = await browser.newContext();
  const ownerSession = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
  const ownerPage = await injectSession(ownerContext, ownerSession);

  // Read the current live geography value so we can restore it after.
  const beforeRes = await request.get(`${SUPABASE_URL}/rest/v1/investor_profiles?user_id=eq.${testEnv.TEST_INVESTOR_USER_ID}&select=geography`, { headers: adminHeaders() });
  const [beforeRow] = await beforeRes.json();
  const originalGeography = beforeRow?.geography ?? "";
  const proposedGeography = `R12B-verify-geo-${Date.now()}`;

  try {
    // ── Associate proposes an edit ──
    await associatePage.goto(PROFILE_URL, { waitUntil: "networkidle" });
    // Wait for the fund's real data to hydrate the form (existing loads
    // async via useAccountContext -> fundOwnerUserId -> investor_profiles
    // query chain) before interacting — otherwise handleSave's "Fund name
    // required" validation can fire against a still-empty form.
    const fundNameInput = associatePage.locator('input[placeholder="Acme Ventures"]');
    await expect(fundNameInput).toHaveValue(/.+/, { timeout: 10_000 });
    const geographyInput = associatePage.locator('input[placeholder="North America, Europe"]');
    await expect(geographyInput).toBeVisible({ timeout: 10_000 });
    await geographyInput.fill(proposedGeography);
    await associatePage.getByRole("button", { name: /save/i }).first().click();

    await expect(associatePage.getByText(/submitted for approval/i)).toBeVisible({ timeout: 10_000 });
    await associatePage.screenshot({ path: "/tmp/playwright-r12c-associate-after-propose.png" });

    // Inline "Awaiting approval" badge shows next to the field. The
    // myPendingChanges query needs to refetch after the propose insert
    // (invalidated but not necessarily settled by the time the toast
    // fires) — give it a realistic window.
    await expect(associatePage.getByText("Awaiting approval").first()).toBeVisible({ timeout: 10_000 });

    // Public/live data must NOT reflect the proposed value yet.
    const midRes = await request.get(`${SUPABASE_URL}/rest/v1/investor_profiles?user_id=eq.${testEnv.TEST_INVESTOR_USER_ID}&select=geography`, { headers: adminHeaders() });
    const [midRow] = await midRes.json();
    expect(midRow.geography).not.toBe(proposedGeography);
    expect(midRow.geography).toBe(originalGeography);

    // ── Owner sees the queue and approves ──
    await ownerPage.goto(PROFILE_URL, { waitUntil: "networkidle" });
    await expect(ownerPage.getByText(/pending changes/i)).toBeVisible({ timeout: 10_000 });
    await expect(ownerPage.getByText(proposedGeography)).toBeVisible();
    await ownerPage.screenshot({ path: "/tmp/playwright-r12c-owner-queue.png" });

    await ownerPage.getByRole("button", { name: /^approve$/i }).first().click();
    await expect(ownerPage.getByText(/change approved and applied/i)).toBeVisible({ timeout: 10_000 });
    await ownerPage.screenshot({ path: "/tmp/playwright-r12c-owner-after-approve.png" });

    // Live data now reflects the approved value.
    const afterRes = await request.get(`${SUPABASE_URL}/rest/v1/investor_profiles?user_id=eq.${testEnv.TEST_INVESTOR_USER_ID}&select=geography`, { headers: adminHeaders() });
    const [afterRow] = await afterRes.json();
    expect(afterRow.geography).toBe(proposedGeography);

    // ── Associate's still-open session reflects the approval live, no reload ──
    await expect(associatePage.getByText(/was approved/i)).toBeVisible({ timeout: 15_000 });
    await expect(associatePage.getByText("Awaiting approval")).toHaveCount(0);
    await associatePage.screenshot({ path: "/tmp/playwright-r12c-associate-after-approval-live.png" });
  } finally {
    await request.patch(`${SUPABASE_URL}/rest/v1/investor_profiles?user_id=eq.${testEnv.TEST_INVESTOR_USER_ID}`, {
      headers: { ...adminHeaders(), Prefer: "return=representation" },
      data: { geography: originalGeography },
    });
    await request.delete(`${SUPABASE_URL}/rest/v1/investor_profile_pending_changes?proposed_by=eq.${testEnv.TEST_INVESTOR_MEMBER_USER_ID}`, { headers: adminHeaders() });
    await associateContext.close();
    await ownerContext.close();
  }
});

// R12C VERIFY — repeat with a rejection: field stays unchanged, Associate
// notified live.
test("Associate edit -> Owner rejects -> live value unchanged, Associate notified", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  await request.delete(`${SUPABASE_URL}/rest/v1/investor_profile_pending_changes?proposed_by=eq.${testEnv.TEST_INVESTOR_MEMBER_USER_ID}`, { headers: adminHeaders() });

  const associateContext = await browser.newContext();
  const associateSession = await getSession(ASSOCIATE_EMAIL, ASSOCIATE_PASSWORD);
  const associatePage = await injectSession(associateContext, associateSession);

  const ownerContext = await browser.newContext();
  const ownerSession = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
  const ownerPage = await injectSession(ownerContext, ownerSession);

  const beforeRes = await request.get(`${SUPABASE_URL}/rest/v1/investor_profiles?user_id=eq.${testEnv.TEST_INVESTOR_USER_ID}&select=geography`, { headers: adminHeaders() });
  const [beforeRow] = await beforeRes.json();
  const originalGeography = beforeRow?.geography ?? "";
  const proposedGeography = `R12B-verify-reject-${Date.now()}`;

  try {
    await associatePage.goto(PROFILE_URL, { waitUntil: "networkidle" });
    // Wait for the fund's real data to hydrate the form (existing loads
    // async via useAccountContext -> fundOwnerUserId -> investor_profiles
    // query chain) before interacting — otherwise handleSave's "Fund name
    // required" validation can fire against a still-empty form.
    const fundNameInput = associatePage.locator('input[placeholder="Acme Ventures"]');
    await expect(fundNameInput).toHaveValue(/.+/, { timeout: 10_000 });
    const geographyInput = associatePage.locator('input[placeholder="North America, Europe"]');
    await expect(geographyInput).toBeVisible({ timeout: 10_000 });
    await geographyInput.fill(proposedGeography);
    await associatePage.getByRole("button", { name: /save/i }).first().click();
    await expect(associatePage.getByText(/submitted for approval/i)).toBeVisible({ timeout: 10_000 });

    await ownerPage.goto(PROFILE_URL, { waitUntil: "networkidle" });
    await expect(ownerPage.getByText(proposedGeography)).toBeVisible({ timeout: 10_000 });
    await ownerPage.getByRole("button", { name: /^reject$/i }).first().click();
    await ownerPage.getByRole("button", { name: /confirm reject/i }).click();
    await expect(ownerPage.getByText(/change rejected/i)).toBeVisible({ timeout: 10_000 });

    const afterRes = await request.get(`${SUPABASE_URL}/rest/v1/investor_profiles?user_id=eq.${testEnv.TEST_INVESTOR_USER_ID}&select=geography`, { headers: adminHeaders() });
    const [afterRow] = await afterRes.json();
    expect(afterRow.geography).toBe(originalGeography);
    expect(afterRow.geography).not.toBe(proposedGeography);

    await expect(associatePage.getByText(/was rejected/i)).toBeVisible({ timeout: 15_000 });
    await associatePage.screenshot({ path: "/tmp/playwright-r12c-associate-after-rejection-live.png" });
  } finally {
    await request.delete(`${SUPABASE_URL}/rest/v1/investor_profile_pending_changes?proposed_by=eq.${testEnv.TEST_INVESTOR_MEMBER_USER_ID}`, { headers: adminHeaders() });
    await associateContext.close();
    await ownerContext.close();
  }
});
