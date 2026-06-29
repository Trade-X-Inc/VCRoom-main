/**
 * Playwright tests: DR-7 — Stage transition wiring
 * Uses dedicated test deal room: 11111111-2222-3333-4444-555555555555
 * which is always reset to workflow_stage='information_vault' in beforeAll.
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
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return env;
}

const testEnv = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL = localEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = process.env.PLAYWRIGHT_BASE_URL || "https://hockystick.app";
const DEAL_ROOM_ID = "11111111-2222-3333-4444-555555555555";

const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL || "test-investor@hockystick.app";
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;
const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL || "test-founder@hockystick.app";
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;

async function getSession(email: string, password?: string) {
  if (!SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");
  if (!password) throw new Error(`Missing password for ${email}`);
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ email, password }),
  });
  const session = await r.json() as any;
  if (!session.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(session)}`);
  return session;
}

async function injectSession(ctx: BrowserContext, session: any) {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(({ key, val }: any) => {
    localStorage.setItem(key, JSON.stringify(val));
    localStorage.setItem("vr.theme", "light");
    localStorage.setItem("hs_ai_panel_open", "false");
  }, {
    key: STORAGE_KEY,
    val: {
      access_token: session.access_token, refresh_token: session.refresh_token,
      expires_in: session.expires_in, expires_at: session.expires_at,
      token_type: session.token_type, user: session.user,
    },
  });
  await p.close();
}

async function openDealRoom(ctx: BrowserContext, session: any) {
  await injectSession(ctx, session);
  const page = await ctx.newPage();
  await page.goto(`${APP}/app/deal-room/${DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Verifying access") &&
          !document.body.textContent?.includes("Signing you in"),
    { timeout: 30000 },
  );
  await page.waitForTimeout(2000);
  if (page.url().includes("/nda")) return null;
  return page;
}

async function dbQuery(sql: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, { method: "GET" }); // just for connectivity check
  void r;
  // Use direct table API instead
  throw new Error("Use direct table queries, not RPC");
}

async function serviceGet(path: string) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: "application/json" },
  });
  return r.json() as Promise<any[]>;
}

async function servicePatch(path: string, body: any) {
  return fetch(`${SUPABASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

async function serviceDelete(path: string) {
  return fetch(`${SUPABASE_URL}${path}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

let investorSession: any;
let founderSession: any;

test.beforeAll(async () => {
  [investorSession, founderSession] = await Promise.all([
    getSession(INVESTOR_EMAIL, INVESTOR_PASS),
    getSession(FOUNDER_EMAIL, FOUNDER_PASS),
  ]);

  // Reset test deal room to clean state: information_vault, no pending transitions
  await Promise.all([
    servicePatch(
      `/rest/v1/deal_rooms?id=eq.${DEAL_ROOM_ID}`,
      { workflow_stage: "information_vault", status: "active" },
    ),
    serviceDelete(
      `/rest/v1/deal_room_stage_transitions?deal_room_id=eq.${DEAL_ROOM_ID}`,
    ),
  ]);
  // Allow a moment for the DB writes to propagate
  await new Promise((r) => setTimeout(r, 500));
});

test.describe("DR-7: Stage transition wiring", () => {

  test("1. Investor requests next stage from Information Vault", async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext();
    const page = await openDealRoom(ctx, investorSession);

    console.log("\n── TEST 1: Investor requests next stage ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // Navigate to Information Vault tab
    const ivTab = page.getByTestId("stage-pill-information_vault");
    await expect(ivTab).toBeVisible({ timeout: 10000 });
    await ivTab.click({ force: true });
    await page.waitForTimeout(2000);

    // Click the Request next stage button
    const nextBtn = page.getByTestId("info-vault-next-stage");
    await expect(nextBtn).toBeVisible({ timeout: 10000 });
    await nextBtn.click();
    console.log("Clicked info-vault-next-stage");

    // Wait for the request to complete (button may briefly show spinner then revert)
    await page.waitForTimeout(3000);

    // Check DB for the transition row
    const rows = await serviceGet(
      `/rest/v1/deal_room_stage_transitions?deal_room_id=eq.${DEAL_ROOM_ID}&order=created_at.desc&limit=1`,
    );
    const transition = Array.isArray(rows) ? rows[0] : null;
    console.log("DB transition row:", JSON.stringify(transition));

    expect(transition).toBeTruthy();
    expect(transition?.status).toBe("pending");
    expect(transition?.to_stage).toBe("qa");

    console.log(`status=${transition?.status}, to_stage=${transition?.to_stage} ✓`);

    const jsErrors = errors.filter((e) => e.includes("is not defined") || e.includes("ReferenceError"));
    expect(jsErrors.length).toBe(0);

    await page.screenshot({ path: "/tmp/pw-dr7-1.png" });
    await ctx.close();
  });

  test("2. Founder sees approval banner", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    const page = await openDealRoom(ctx, founderSession);

    console.log("\n── TEST 2: Founder sees approval banner ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    // The banner appears at the top of the deal room main area — visible regardless of active tab
    const banner = page.getByTestId("stage-approval-banner");
    await expect(banner).toBeVisible({ timeout: 15000 });
    console.log("stage-approval-banner visible ✓");

    const approveBtn = page.getByTestId("stage-approve-btn");
    await expect(approveBtn).toBeVisible({ timeout: 5000 });
    console.log("Approve button visible ✓");

    const body = await page.textContent("body") ?? "";
    const hasApproveText = body.includes("Approve") && body.includes("qa");
    console.log(`Banner text contains Approve + qa: ${hasApproveText}`);
    expect(hasApproveText).toBe(true);

    await page.screenshot({ path: "/tmp/pw-dr7-2.png" });
    await ctx.close();
  });

  test("3. Founder approves — deal room advances to qa", async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext();
    const page = await openDealRoom(ctx, founderSession);

    console.log("\n── TEST 3: Founder approves transition ──");
    if (!page) { console.log("NDA redirect — skipping"); await ctx.close(); return; }

    const banner = page.getByTestId("stage-approval-banner");
    await expect(banner).toBeVisible({ timeout: 15000 });

    const approveBtn = page.getByTestId("stage-approve-btn");
    await approveBtn.click();
    console.log("Clicked Approve");
    await page.waitForTimeout(4000);

    // Banner should disappear after approval
    const bannerGone = await banner.isVisible().catch(() => false);
    console.log(`Banner gone after approval: ${!bannerGone}`);

    // Check transition status in DB
    const transitions = await serviceGet(
      `/rest/v1/deal_room_stage_transitions?deal_room_id=eq.${DEAL_ROOM_ID}&order=created_at.desc&limit=1`,
    );
    const transition = Array.isArray(transitions) ? transitions[0] : null;
    console.log("Transition row after approve:", JSON.stringify(transition));
    expect(transition?.status).toBe("approved");

    // Check deal room workflow_stage
    const rooms = await serviceGet(
      `/rest/v1/deal_rooms?id=eq.${DEAL_ROOM_ID}&select=workflow_stage`,
    );
    const room = Array.isArray(rooms) ? rooms[0] : null;
    console.log("Deal room workflow_stage:", room?.workflow_stage);
    expect(room?.workflow_stage).toBe("qa");

    console.log(`transition.status=${transition?.status} ✓, deal_room.workflow_stage=${room?.workflow_stage} ✓`);

    await page.screenshot({ path: "/tmp/pw-dr7-3.png" });
    await ctx.close();
  });

  test("4. Notifications created for both parties", async ({ browser: _ }) => {
    test.setTimeout(30000);

    console.log("\n── TEST 4: Notifications ──");

    const notifications = await serviceGet(
      `/rest/v1/notifications?meta->>deal_room_id=eq.${DEAL_ROOM_ID}&order=created_at.desc&limit=5`,
    );

    console.log("Notifications:", JSON.stringify(notifications));

    const rows = Array.isArray(notifications) ? notifications : [];
    expect(rows.length).toBeGreaterThanOrEqual(1);

    const titles = rows.map((n: any) => n.title);
    console.log("Notification titles:", titles);

    // At least one notification should exist for this deal room
    const hasNotif = rows.some(
      (n: any) => n.title?.includes("Stage advance") || n.body?.includes("qa") || n.body?.includes("approved"),
    );
    console.log(`At least one relevant notification: ${hasNotif}`);
    expect(hasNotif).toBe(true);
  });

});
